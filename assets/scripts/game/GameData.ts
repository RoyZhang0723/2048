import { v2, Vec2 } from "cc";
import { BaseModel } from "../utils/BaseModel";
import { GameBoardModel } from "./GameBoardModel";

export default class GameData extends BaseModel {
    best: number = 0;
    score: number = 0;

    boardModel: GameBoardModel;

    neverWin: boolean = false;

    get isBoardFull(): boolean {
        return this.boardModel.emptyGridModels.length <= 0;
    }

    get isOver(): boolean {
        return this.win || this.lose;
    }

    get win(): boolean {
        return this.boardModel.win && !this.neverWin;
    }

    get lose(): boolean {
        return this.isBoardFull && !this.canMerge;
    }

    get canMerge(): boolean {
        // 从左下角开始，往右上角查找
        // 不需要管格子左边、下边相邻的格子
        for (let x = 0; x < this.boardModel.size; ++x) {
            for (let y = 0; y < this.boardModel.size; ++y) {
                let right = x + 1;
                let up = y + 1;

                let mergeRight = this.boardModel.isInside(right, y) && this.#canMerge(v2(x, y), v2(right, y));
                let mergeUp = this.boardModel.isInside(x, up) && this.#canMerge(v2(x, y), v2(x, up));
                if (mergeRight || mergeUp) {
                    return true;
                }
            }
        }
        return false;
    }

    protected get synchronizeKey(): string {
        return 'com.game.data';
    }

    constructor() {
        super();
        this.awakeFromDisk();
    }

    #canMerge(vec: Vec2, other: Vec2): boolean {
        let gridModel = this.boardModel.gridModelAt(vec.x, vec.y);
        let otherModel = this.boardModel.gridModelAt(other.x, other.y);
        return gridModel && otherModel && gridModel.point === otherModel.point;
    }

    dataForSynchronize(): any {
        return {
            best: this.best,
            score: this.score,
            boardModel: this.boardModel.dataForSynchronize()
        }
    }

    fromDiskJSON(json: any) {
        this.best = json.best ?? 0;
        this.score = json.score ?? 0;

        this.boardModel = new GameBoardModel();
        this.boardModel.fromDiskJSON(json.boardModel);
    }

    refreshBestScore() {
        if (this.score > this.best) {
            this.best = this.score;
        }
    }

    reset() {
        this.boardModel.gridModels.forEach(model => model.clear());
        this.score = 0;
    }
}
