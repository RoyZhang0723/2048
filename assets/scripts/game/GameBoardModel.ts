import { Size, v2, Vec2 } from "cc";
import { Direction } from "../defines/GameDefine";
import IClone from "../interfaces/Clone";
import { BaseModel } from "../utils/BaseModel";
import { groupBy, range } from "../utils/lodash";
import { MergeAnimationInfo, MoveAnimationInfo } from "./GameAnimationInfo";
import GameBoardGridModel from "./GameBoardGridModel";
import GameLogicGenerator from "./GameLogicGenerator";

export interface BoardGenerateElement {
    success: boolean;
    model?: GameBoardGridModel;
}

type GridKeys = "x" | "y";

export class GameBoardModel extends BaseModel implements IClone<GameBoardModel> {
    #generator: GameLogicGenerator;

    #gridModels: GameBoardGridModel[] = [];

    #boardContentSize: Size = new Size();
    #size: number = 4;

    get generator(): GameLogicGenerator {
        return this.#generator;
    }

    get gridModels(): GameBoardGridModel[] {
        return this.#gridModels;
    }

    get emptyGridModels(): GameBoardGridModel[] {
        return this.#gridModels.filter(model => model.isEmpty);
    }

    get notEmptyGridModels(): GameBoardGridModel[] {
        return this.#gridModels.filter(model => !model.isEmpty);
    }

    get size() {
        return this.#size;
    }

    get win(): boolean {
        let target = 2 * this.#generator.base ** 10;
        return this.notEmptyGridModels.some(m => m.point >= target);
    }

    constructor() {
        super();
        this.#generator = new GameLogicGenerator();
    }

    initBoardGridInfos(boardContentSize: Size, size: number, insets: number) {
        this.#boardContentSize.set(boardContentSize);
        this.#size = size;
        this.#clearIfSizeNotMatch();

        let gridSide = (boardContentSize.width - (size + 1) * insets) / size;
        let initPoint = boardContentSize.width / 2;
        range(0, size).forEach(y => {
            range(0, size).forEach(x => {
                let xPoint = -initPoint + insets + x * (insets + gridSide);
                let yPoint = -initPoint + insets + y * (insets + gridSide);
                let model = this.gridModelAt(x, y);
                if (!model) {
                    model = new GameBoardGridModel();
                    this.#gridModels.push(model);
                }
                model.x = x;
                model.y = y;
                model.rect.set(xPoint, yPoint, gridSide, gridSide);
            });
        });
    }

    #clearIfSizeNotMatch() {
        if (this.#size ** 2 != this.#gridModels.length) {
            this.#gridModels = [];
        }
    }

    gridModelAt(x: number, y: number): GameBoardGridModel | null {
        let index = this.transformVectorToIndex(x, y);
        if (isNaN(index)) {
            return null;
        }
        return this.#gridModels[index];
    }

    isInside(x: number, y: number): boolean {
        return x >= 0 && x < this.#size && y >= 0 && y < this.#size;
    }

    isGridEmpty(x: number, y: number): boolean {
        let grid = this.gridModelAt(x, y);
        return grid && grid.isEmpty;
    }

    transformVectorToIndex(x: number, y: number): number {
        return this.isInside(x, y) ? y * this.#size + x : NaN;
    }

    next(): BoardGenerateElement {
        let gridModel = this.#generator.next(this.emptyGridModels);
        if (!gridModel) {
            console.error(`No valid grid.`);
            return {
                success: false
            };
        }

        return {
            success: true,
            model: gridModel
        };
    }

    tampBoardToDirection(direction: Direction): MoveAnimationInfo[] {
        return this.#excuteActionGroupByDirection(direction, this.#tampSingleLineGrids.bind(this));
    }

    #excuteActionGroupByDirection<T>(direction: Direction, action: (gridGroups: GameBoardGridModel[], reverse: boolean) => []): T[] {
        let transformKey: GridKeys;
        let sortKey: GridKeys;
        if (this.#isHorizontalDirection(direction)) {
            transformKey = 'y';
            sortKey = 'x';
        } else if (this.#isVerticalDirection(direction)) {
            transformKey = 'x';
            sortKey = 'y';
        }
        let reverse = Math.log2(direction) % 2 === 1;
        let groups = groupBy(this.#gridModels, model => `${model[transformKey]}`);
        let gridGroups = Array.from(groups.values());
        gridGroups.forEach(grids => grids.sort((lhr, rhs) => lhr[sortKey] - rhs[sortKey]));
        return gridGroups.reduce((infos, grids) => infos.concat(action(grids, reverse)), [] as T[]);
    }

    #isHorizontalDirection(direction: Direction): boolean {
        return direction === Direction.Left || direction === Direction.Right;
    }

    #isVerticalDirection(direction: Direction): boolean {
        return direction === Direction.Up || direction === Direction.Down;
    }

    #tampSingleLineGrids(lineGrids: GameBoardGridModel[], reverse: boolean): MoveAnimationInfo[] {
        let infos: MoveAnimationInfo[] = [];

        let emptyIndex = -1;
        let grids = reverse ? lineGrids.reverse() : lineGrids;
        grids.forEach((grid, index) => {
            if (grid.isEmpty) {
                if (emptyIndex === -1) {
                    emptyIndex = index;
                }
            } else {
                if (emptyIndex !== -1) {
                    let emptyGrid = grids[emptyIndex];
                    emptyGrid?.copyFrom(grid);
                    grid.clear();
                    ++emptyIndex;

                    infos.push({
                        from: {
                            x: grid.x,
                            y: grid.y
                        },
                        to: {
                            x: emptyGrid.x,
                            y: emptyGrid.y
                        }
                    });
                }
            }
        });
        reverse ? lineGrids.reverse() : undefined;

        return infos;
    }

    mergeBoardToDirection(direction: Direction): MergeAnimationInfo[] {
        return this.#excuteActionGroupByDirection(direction, this.#mergeSingleLineGrids.bind(this));
    }

    #mergeSingleLineGrids(lineGrids: GameBoardGridModel[], reverse: boolean): MergeAnimationInfo[] {
        let infos: MergeAnimationInfo[] = [];
        let grids = reverse ? lineGrids.reverse() : lineGrids;
        let notEmptyIndex = -1;
        for (let index = 0; index < grids.length; ++index) {
            let grid = grids[index];
            if (grid.isEmpty) {
                continue;
            }

            if (notEmptyIndex === -1) {
                notEmptyIndex = index;
                continue;
            }

            let notEmptyGrid = grids[notEmptyIndex];
            if (grid.point === notEmptyGrid.point) {
                // 合并逻辑
                notEmptyGrid.double();
                grid.clear();
                notEmptyIndex = -1;

                infos.push({
                    lhs: {
                        x: notEmptyGrid.x,
                        y: notEmptyGrid.y
                    },
                    rhs: {
                        x: grid.x,
                        y: grid.y
                    },
                    to: {
                        x: notEmptyGrid.x,
                        y: notEmptyGrid.y
                    },
                    score: notEmptyGrid.point
                });
            } else {
                notEmptyIndex = index;
            }
        }
        reverse ? lineGrids.reverse() : undefined;

        return infos;
    }

    dataForSynchronize(): any {
        return this.#gridModels.reduce((data, model) => data.concat([{
            x: model.x,
            y: model.y,
            point: model.point
        }]), []);
    }

    fromDiskJSON(json: any) {
        json = json ?? [];
        json.forEach((data: any) => {
            let model = new GameBoardGridModel();
            model.x = data.x;
            model.y = data.y;
            model.point = data.point;
            this.#gridModels.push(model);
        });
    }

    clone(): GameBoardModel {
        let model = new GameBoardModel();
        model.#size = this.#size;
        model.#boardContentSize.set(this.#boardContentSize);
        model.#gridModels.push(...this.#gridModels.map(model => model.clone()));
        return model;
    }

    canMoveToDirection(direction: Direction): boolean {
        let cloned = this.clone();
        let mergeAnimationInfos = cloned.mergeBoardToDirection(direction);
        let moveAnimationInfos = cloned.tampBoardToDirection(direction);
        return mergeAnimationInfos.length > 0 || moveAnimationInfos.length > 0;
    }

    // #region AI Score
    // 棋盘空节点数
    get emptyGridsCount(): number {
        return this.emptyGridModels.length;
    }

    // 最大分数
    get maxPoint(): number {
        return this.#gridModels.reduce((max, grid) => Math.max(max, grid.point), -Infinity);
    }

    // 二维数组岛屿
    #visited: Set<string> = new Set();
    get islands(): number {
        this.#visited.clear();
        let islands = 0;
        this.#gridModels.forEach(grid => {
            if (grid.isEmpty || this.#visited.has(grid.toString())) {
                return;
            }
            ++islands;
            this.#floodIsland(grid);
        });
        return islands;
    }

    // 将所有相邻的格子设为已访问
    #floodIsland(grid: GameBoardGridModel) {
        let dirs = [
            Vec2.UNIT_X,
            Vec2.UNIT_Y
        ];
        dirs.forEach(dir => {
            if (!this.isInside(grid.x + dir.x, grid.y + dir.y)) {
                return;
            }
            let model = this.gridModelAt(grid.x + dir.x, grid.y + dir.y);
            if (model.point === grid.point) {
                this.#visited.add(model.toString());
                this.#floodIsland(model);
            }
        });
    }

    // 平滑度，负数
    get smoothness(): number {
        let smoothness = 0;
        let dirs = [
            Vec2.UNIT_X,
            Vec2.UNIT_Y
        ];
        this.#gridModels.forEach(grid => {
            if (grid.isEmpty) {
                return;
            }
            dirs.forEach(dir => {
                let x = grid.x;
                let y = grid.y
                do {
                    x += dir.x;
                    y += dir.y;
                } while (this.isInside(x, y) && this.isGridEmpty(x, y));

                if (this.isInside(x, y) && !this.isGridEmpty(x, y)) {
                    let next = this.gridModelAt(x, y);
                    smoothness -= Math.abs(Math.log2(grid.point) - Math.log2(next.point));
                }
            });
        });
        return smoothness;
    }

    // 单调性
    get monotonicity(): number {
        let iterator = (vectorTransformer: (index: number, counter: number) => Vec2,
            callbackFn: (currentValue: number, nextValue: number) => void) => {
            for (let i = 0; i < this.#size; ++i) {
                let current = 0;
                let next = current + 1;
                while (next < this.#size) {
                    let vector = vectorTransformer(i, next);
                    while (this.isInside(vector.x, vector.y) && this.isGridEmpty(vector.x, vector.y)) {
                        vector = vectorTransformer(i, ++next);
                    }

                    if (next >= this.#size) {
                        next = this.#size - 1;
                    }

                    let gridValue = (x: number, y: number) => Math.max(1, this.gridModelAt(x, y).point);
                    let score = (vec: Vec2) => Math.log2(gridValue(vec.x, vec.y));
                    let currentScore = score(vectorTransformer(i, current));
                    let nextScore = score(vectorTransformer(i, next));
                    callbackFn(currentScore, nextScore);

                    current = next;
                    ++next;
                }
            }
        }

        let results = [0, 0, 0, 0];
        iterator((index, counter) => v2(index, counter),
            (cur, next) => results[cur > next ? 0 : 1] -= Math.abs(cur - next));
        iterator((index, counter) => v2(counter, index),
            (cur, next) => results[cur > next ? 2 : 3] -= Math.abs(cur - next));

        return Math.max(results[0], results[1]) + Math.max(results[2], results[3]);
    }
    // #endregion
}
