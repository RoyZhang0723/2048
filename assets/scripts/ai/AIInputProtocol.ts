import { Direction } from "../defines/GameDefine";
import { GameBoardModel } from "../game/GameBoardModel";

export interface AISearchReuslt {
    optimalSolution: boolean;
    direction: Direction;
}

export interface AIInputProtocol {
    search(boardModel: GameBoardModel, depth: number): AISearchReuslt;
}
