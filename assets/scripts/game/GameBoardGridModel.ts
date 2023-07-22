import { Rect } from "cc";
import IClone from "../interfaces/Clone";

export default class GameBoardGridModel implements IClone<GameBoardGridModel> {
    // 列 x
    x: number = 0;
    // 行 y
    y: number = 0;
    // 矩形
    rect: Rect = new Rect();

    // 数字
    point: number = 0;

    get isEmpty(): boolean {
        return this.point <= 0;
    }

    copyFrom(other: GameBoardGridModel) {
        this.point = other.point;
    }

    double() {
        this.point *= 2;
    }

    clear() {
        this.point = 0;
    }

    clone(): GameBoardGridModel {
        let clone = new GameBoardGridModel();
        clone.x = this.x;
        clone.y = this.y;
        clone.rect.set(this.rect);
        clone.point = this.point;
        return clone;
    }

    toString(): string {
        return `grid_${this.x}_${this.y}`;
    }
}
