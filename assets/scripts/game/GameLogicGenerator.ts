import { groupBy, randomInt, shuffle } from "../utils/lodash";
import GameBoardGridModel from "./GameBoardGridModel";

export default class GameLogicGenerator {
    base: number = 2;

    constructor(base: number = 2) {
        this.base = base;
    }

    next(emptyGrids: GameBoardGridModel[]): GameBoardGridModel | null {
        let grid = this.#randomGrid(emptyGrids);
        if (!grid) {
            return grid;
        }

        let point = Math.random() < 0.9 ? this.base : this.base * 2;
        grid.point = point;
        return grid;
    }

    #randomGrid(grids: GameBoardGridModel[]): GameBoardGridModel | null {
        if (grids.length <= 0) {
            return null;
        }

        let index = randomInt(grids.length);
        return grids[index];
    }

    #randomGridAtEdge(grids: GameBoardGridModel[]): GameBoardGridModel | null {
        if (grids.length <= 0) {
            return null;
        }

        let groups = groupBy(grids, grid => `${grid.y}`);
        groups.forEach(grids => grids.sort((a, b) => a.x - b.x));
        let shuffleArray = shuffle(Array.from(Array.from(groups.values()).reduce((set, grids) => {
            set.add(grids[0]);
            set.add(grids[grids.length - 1]);
            return set;
        }, new Set<GameBoardGridModel>())));
        return shuffleArray[0];
    }
}
