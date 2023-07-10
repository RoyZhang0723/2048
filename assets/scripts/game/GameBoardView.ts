import { _decorator, Component, UITransform, Size, Color, v3 } from 'cc';
import ColorGraphics from '../components/ColorGraphics';
import { HEXColor } from '../defines/ColorDefine';
import { Direction, RoundRectRadius } from '../defines/GameDefine';
import { GameBoardColorGrid } from './GameBoardColorGrid';
import { range } from '../utils/lodash';
import { GameBoardPointGrid } from './GameBoardPointGrid';
import GameBoardGridModel from './GameBoardGridModel';
import { Grid, MergeAnimationInfo, MoveAnimationInfo } from './GameAnimationInfo';
import GameData from './GameData';
import { AudioName } from '../defines/AudioDefine';

const { ccclass, requireComponent } = _decorator;

interface AudioPlayer {
    playAudio(name: string): void;
}

interface Scheduler {
    nextFrameCall(callbackFn: Function): void;
}

@ccclass('GameBoardView')
@requireComponent(ColorGraphics)
export class GameBoardView extends Component {
    gameData: GameData;

    #grids: GameBoardPointGrid[] = [];

    audioPlayer: AudioPlayer;
    scheduler: Scheduler;

    configure(side: number) {
        let transform = this.getComponent(UITransform);
        transform.contentSize = new Size(side, side);

        let colorGraphics = this.getComponent(ColorGraphics);
        colorGraphics.color = new Color(HEXColor.DarkGray);
        colorGraphics.radius = RoundRectRadius;

        this.#configureGrids();
    }

    #configureGrids() {
        this.#destroyAllGrids();

        let color = new Color(HEXColor.Gray);
        this.gameData.boardModel.gridModels.forEach(model => this.#createGrid(model, color));
    }

    #createGrid(model: GameBoardGridModel, color: Color) {
        let grid = GameBoardColorGrid.new();
        grid.node.name = `grid_${model.x}_${model.y}`;
        grid.node.setParent(this.node, false);
        grid.node.position = v3(model.rect.center.x, model.rect.center.y);
        grid.getComponent(UITransform).contentSize = model.rect.size;
        grid.configure(color);
    }

    restart() {
        this.#clear();
        if (this.gameData.boardModel.notEmptyGridModels.length <= 0) {
            this.#giveMeTwoPointGrids();
        } else {
            this.#violentUpadte();
        }
    }

    #clear() {
        this.#destroyAllGrids();
    }

    #destroyAllGrids() {
        this.#grids.forEach(grid => grid.node.destroy());
        this.#grids = [];
    }

    #giveMeTwoPointGrids() {
        range(0, 2).forEach(_ => this.#randomPointGrid().appearIn());
    }

    #randomPointGrid(): GameBoardPointGrid {
        let element = this.gameData.boardModel.next();
        if (!element.success) {
            console.error(`No next grid.`);
            return null;
        }

        // console.log(`Random point grid: ${element.model.x}, ${element.model.y}`);
        return this.#createPointGridAt(element.model);
    }

    #createPointGridAt(model: GameBoardGridModel): GameBoardPointGrid {
        let pointGrid = GameBoardPointGrid.new();
        pointGrid.node.setParent(this.node, false);
        pointGrid.node.position = v3(model.rect.center.x, model.rect.center.y);
        pointGrid.getComponent(UITransform).contentSize = model.rect.size;
        pointGrid.x = model.x;
        pointGrid.y = model.y;
        pointGrid.updatePoint(model.point);
        this.#grids.push(pointGrid);

        return pointGrid;
    }

    async slideToDirection(direction: Direction, animating: boolean = true) {
        if (!this.gameData.boardModel.canMoveToDirection(direction)) {
            return Promise.resolve();
        }

        let mergeAnimationInfos = this.gameData.boardModel.mergeBoardToDirection(direction);
        let moveAnimationInfos = this.gameData.boardModel.tampBoardToDirection(direction);
        let score = mergeAnimationInfos.reduce((score, info) => score + info.score, 0);
        this.gameData.score = this.gameData.score + score;
        this.gameData.refreshBestScore();

        let fn = animating ? this.#slideWithAnimation : this.#slideWithoutAnimation;
        await fn.call(this, mergeAnimationInfos, moveAnimationInfos);
    }

    async #slideWithoutAnimation(mergeAnimationInfos: MergeAnimationInfo[], moveAnimationInfos: MoveAnimationInfo[]) {
        if (mergeAnimationInfos.length > 0 || moveAnimationInfos.length > 0) {
            this.#violentUpadte();
            this.#randomPointGrid();
            return new Promise<void>(resolve => {
                this.scheduler.nextFrameCall(() => {
                    resolve();
                });
            });
        }
    }

    async #slideWithAnimation(mergeAnimationInfos: MergeAnimationInfo[], moveAnimationInfos: MoveAnimationInfo[]) {
        let animationInfos = this.#concatAnimationInfos(mergeAnimationInfos, moveAnimationInfos);
        let promises = animationInfos.map(animationInfo => this.#consumeAnimationInfo(animationInfo));

        if (mergeAnimationInfos.length > 0) {
            this.audioPlayer.playAudio(AudioName.Merge);
        }

        // 有移动才刷新新的格子
        if (promises.length > 0) {
            this.audioPlayer.playAudio(AudioName.Sweep);
            promises = promises.concat(this.#randomPointGrid()?.appearIn());
        }

        await Promise.all(promises);
    }

    #concatAnimationInfos(mergeAnimationInfos: MergeAnimationInfo[], moveAnimationInfos: MoveAnimationInfo[]): (MergeAnimationInfo | MoveAnimationInfo)[] {
        let deleteIndexes: number[] = [];
        mergeAnimationInfos.forEach(mergeAnimationInfo => {
            moveAnimationInfos.forEach((moveAnimationInfo, index) => {
                if (this.#equals(mergeAnimationInfo.to, moveAnimationInfo.from)) {
                    deleteIndexes.push(index);
                    mergeAnimationInfo.to = moveAnimationInfo.to;
                }
            });
        });
        deleteIndexes.reverse().forEach(index => moveAnimationInfos.splice(index, 1));
        return ([] as (MergeAnimationInfo | MoveAnimationInfo)[])
            .concat(mergeAnimationInfos)
            .concat(moveAnimationInfos);
    }

    #equals(lhr: Grid, rhs: Grid): boolean {
        return lhr.x === rhs.x && lhr.y === rhs.y;
    }

    async #consumeAnimationInfo(animationInfo: (MoveAnimationInfo | MergeAnimationInfo)) {
        if ('lhs' in animationInfo && 'rhs' in animationInfo) { // Merge
            let destroyGrids = await Promise.all([
                this.#playMergeAnimation(animationInfo),
                this.#createMergedGridAt(animationInfo)
            ]);
            destroyGrids.forEach(grids => {
                if (Array.isArray(grids)) {
                    grids.forEach(grid => this.#destroyGrid(grid));
                }
            });
        } else { // Move
            await this.#playMoveAnimation(animationInfo);
        }
    }

    async #playMergeAnimation(animationInfo: MergeAnimationInfo): Promise<GameBoardPointGrid[]> {
        let lGrid = await this.#validateAnimationInfo(animationInfo.lhs);
        let rGrid = await this.#validateAnimationInfo(animationInfo.rhs);

        let to = animationInfo.to;
        let toModel = this.gameData.boardModel.gridModelAt(to.x, to.y);
        let grids = [lGrid, rGrid];
        await Promise.all(grids.map(grid => grid.moveTo(toModel)));
        return grids;
    }

    #validateAnimationInfo(grid: Grid): Promise<GameBoardPointGrid> {
        if (!grid) {
            return Promise.reject(`Invalid grid info.`);
        }

        let fromGrid = this.#pointGridAt(grid);
        if (!fromGrid) {
            return Promise.reject(`Not grid at ${grid.x} ${grid.y}.`);
        }

        return Promise.resolve(fromGrid);
    }

    #pointGridAt(location: Grid): GameBoardPointGrid {
        return this.#grids.find(grid => grid.isLocatingAt(location.x, location.y));
    }

    async #createMergedGridAt(info: MergeAnimationInfo): Promise<void> {
        let model = this.gameData.boardModel.gridModelAt(info.to.x, info.to.y);
        let grid = this.#createPointGridAt(model);
        await grid.playMergeAnimation();
    }

    #destroyGrid(grid: GameBoardPointGrid) {
        let index = this.#grids.findIndex(g => g == grid);
        if (index >= 0) {
            this.#grids.splice(index, 1);
        }
        grid.node.destroy();
    }

    async #playMoveAnimation(animationInfo: MoveAnimationInfo): Promise<void> {
        let grid = await this.#validateAnimationInfo(animationInfo.from);
        let to = animationInfo.to;
        let toModel = this.gameData.boardModel.gridModelAt(to.x, to.y);
        await grid.moveTo(toModel);
    }

    #violentUpadte() {
        this.#destroyAllGrids();
        this.gameData.boardModel.notEmptyGridModels.forEach(model => this.#createPointGridAt(model));
    }
}
