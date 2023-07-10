import { Direction } from "../defines/GameDefine";
import { GameBoardModel } from "../game/GameBoardModel";
import { AISearchReuslt } from "./AIInputProtocol";

enum AICharacter {
    Min,
    Max
}

class AlphaBetaAINode {
    character = AICharacter.Min;

    alpha: number = -Infinity;
    score: number = NaN;
    beta: number = Infinity;

    inheritFrom(other: AlphaBetaAINode) {
        this.alpha = other.alpha;
        this.beta = other.beta;
    }
}

class AlphaBetaAINode2048 extends AlphaBetaAINode {
    direction = Direction.None;

    boardModel: GameBoardModel;

    children: AlphaBetaAINode2048[] = [];

    addChild(child: AlphaBetaAINode2048) {
        this.children.push(child);
    }
}

const oppsiteAICharacter = (character: AICharacter) => character === AICharacter.Min ? AICharacter.Max : AICharacter.Min;

const SMOOTHNESS_WEIGHT = 0.1;
const MONOTONICITY_WEIGHT = 1.0;
const MAX_WEIGHT = 1.0;
const EMPTY_WEIGHT = 2.7;

const DEPTH = 5;
const WINNER_SCORE = 999;

// Alpha-beta 剪枝
// - 玩家移动棋盘合成为 max 节点
// - 电脑随机生成新格子为 min 节点
export default class AlphaBetaAIInputAgent {
    static #directions: Direction[];

    static get directions(): Direction[] {
        if (!this.#directions || this.#directions.length <= 0) {
            this.#directions = [];
            for (let dir in Direction) {
                let direction = parseInt(dir);
                if (!isNaN(direction) && direction > 0) {
                    this.#directions.push(direction);
                }
            }
        }
        return this.#directions;
    }

    static eval(boardModel: GameBoardModel): number {
        // 直接赢的情况
        if (boardModel.win) {
            // console.log('Alpha beta [eval] to win');
            return WINNER_SCORE;
        }

        return boardModel.smoothness * SMOOTHNESS_WEIGHT +
            boardModel.monotonicity * MONOTONICITY_WEIGHT +
            Math.log2(boardModel.maxPoint) * MAX_WEIGHT +
            Math.log(boardModel.emptyGridsCount) * EMPTY_WEIGHT;
    }

    static #isWin(score: number): boolean {
        return score >= WINNER_SCORE;
    }

    static search(boardModel: GameBoardModel, depth: number = DEPTH): AISearchReuslt {
        let node = new AlphaBetaAINode2048();
        node.character = AICharacter.Max;
        node.boardModel = boardModel.clone();
        this.#searchWithDepth(node, depth);
        if (isNaN(node.score)) {
            return {
                optimalSolution: false,
                direction: Direction.None
            };
        }
        return {
            optimalSolution: this.#isWin(node.score),
            direction: node.direction
        };
    }

    static #searchWithDepth(aiNode: AlphaBetaAINode2048, depth: number) {
        // 叶子节点只有分数，不需要更新 alpha 和 beta
        if (depth <= 0) {
            aiNode.score = this.eval(aiNode.boardModel);
            return;
        }

        // 深度大于 0，要更新 alpha 和 beta
        if (aiNode.character == AICharacter.Max) {
            // 玩家回合，按方向移动计算
            this.#onPlayerDirectionSearch(aiNode, depth);
        } else {
            // 电脑回合，随机生成一个格子
            this.#onComputerRandomSearch(aiNode, depth);
        }
    }

    // max 节点遍历上下左右 4 个方向
    static #onPlayerDirectionSearch(aiNode: AlphaBetaAINode2048, depth: number) {
        let updater = (direction: Direction): (child: AlphaBetaAIInputAgent) => void => {
            return (child: AlphaBetaAINode2048) => {
                aiNode.score = child.score;
                aiNode.alpha = child.score;
                aiNode.direction = direction;
            }
        };

        for (let direction of this.directions) {
            if (aiNode.boardModel.canMoveToDirection(direction)) {
                let child = this.#childNodeToDirection(aiNode, direction);
                aiNode.addChild(child);

                let directionUpdater = updater(direction);
                if (child.boardModel.win) {
                    this.#searchWithDepth(child, 0);
                    directionUpdater(child);
                    break;
                }

                this.#searchWithDepth(child, depth - 1);
                if (!isNaN(child.score) &&
                    (isNaN(aiNode.score) || child.score > aiNode.score)) {
                    directionUpdater(child);
                }

                if (aiNode.alpha >= aiNode.beta) { // 剪枝
                    // console.log(`Max 剪枝 ${aiNode.alpha} >= ${aiNode.beta}`);
                    break;
                }
            }
        }
    }

    static #childNodeToDirection(aiNode: AlphaBetaAINode2048, direction: Direction): AlphaBetaAINode2048 {
        let child = new AlphaBetaAINode2048();
        child.character = oppsiteAICharacter(aiNode.character);
        child.direction = direction;
        child.inheritFrom(aiNode);
        let boardModel = aiNode.boardModel.clone();
        boardModel.mergeBoardToDirection(direction);
        boardModel.tampBoardToDirection(direction);
        child.boardModel = boardModel;
        return child;
    }

    // min 节点选最坏情况的格子
    // 不然子节点太多（空格子 * [2, 4].length），时间太长
    static #onComputerRandomSearch(aiNode: AlphaBetaAINode2048, depth: number) {
        let emptyGrids = aiNode.boardModel.emptyGridModels;
        let candidates: { x: number, y: number, point: number }[] = [];
        let maxScore = -Infinity;
        let base = aiNode.boardModel.generator.base;
        const values = [base, base ** 2];
        emptyGrids.forEach(grid => {
            values.forEach(value => {
                grid.point = value;
                let score = -aiNode.boardModel.smoothness + aiNode.boardModel.islands;
                candidate: {
                    if (score < maxScore) {
                        break candidate;
                    }
                    if (score > maxScore) {
                        candidates = [];
                        maxScore = score;
                    }
                    candidates.push({
                        x: grid.x,
                        y: grid.y,
                        point: value
                    });
                }
            });
            grid.clear();
        });

        if (candidates && candidates.length > 0) {
            for (let candidate of candidates) {
                let child = this.#childNodeInsert(aiNode, candidate);
                aiNode.addChild(child);
                this.#searchWithDepth(child, depth);
                if (!isNaN(child.score) &&
                    (isNaN(aiNode.score) || child.score < aiNode.score)) {
                    aiNode.score = child.score;
                    aiNode.beta = child.score;
                }
                if (aiNode.alpha >= aiNode.beta) { // 剪枝
                    // console.log(`Min 剪枝 ${aiNode.alpha} >= ${aiNode.beta}`);
                    break;
                }
            }
        }
    }

    static #childNodeInsert(aiNode: AlphaBetaAINode2048, candidate: { x: number, y: number, point: number }): AlphaBetaAINode2048 {
        let child = new AlphaBetaAINode2048();
        child.character = oppsiteAICharacter(aiNode.character);
        child.inheritFrom(aiNode);
        let boardModel = aiNode.boardModel.clone();
        let gridModel = boardModel.gridModelAt(candidate.x, candidate.y);
        gridModel.point = candidate.point;
        child.boardModel = boardModel;
        return child;
    }
}

// PS: 评分标准参考
// http://blog.codinglabs.org/articles/2048-ai-analysis.html
// https://stackoverflow.com/questions/22342854/what-is-the-optimal-algorithm-for-the-game-2048
