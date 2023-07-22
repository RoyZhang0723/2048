import { GameBoardModel } from './GameBoardModel';
import { _decorator, Component, Node, Color, UITransform, Size, Button, RichText, Vec2, v3, VerticalTextAlignment, HorizontalTextAlignment, sys, Layout, v2, macro, Widget, Tween, Vec3, tween, game, Game, Graphics, Enum } from 'cc';
import ColorButton from '../components/ColorButton';
import ColorGraphics from '../components/ColorGraphics';
import { ButtonColor, HEXColor, TextColor } from '../defines/ColorDefine';
import { direction, Direction, GridInsets, isValidDirection, OverPrompt, OverPrompts, RoundRectRadius } from '../defines/GameDefine';
import AudioManager from '../managers/audio/AudioManager';
import InputManager from '../managers/input/InputManager';
import { InputListener } from '../managers/input/InputProtocol';
import Benchmark from '../test/Benchmark';
import { GameBoardView } from './GameBoardView';
import GameData from './GameData';
import { GameScoreNode } from './GameScoreNode';
import { range } from '../utils/lodash';
import { AIInputProtocol } from '../ai/AIInputProtocol';
import AlphaBetaAIInputAgent from '../ai/AlphaBetaAIInputAgent';

const { ccclass, property, disallowMultiple } = _decorator;

enum DepthStrategy {
    Time,
    Define
}
Enum(DepthStrategy);

enum AIStrategy {
    AlphaBeta,
    Expectimax
}
Enum(AIStrategy);

@ccclass('MainScene')
@disallowMultiple
export class MainScene extends Component implements InputListener {
    @property({ displayName: '调试' })
    debug = false;

    @property({ min: 2, max: 10, step: 1, slide: true, visible: true, displayName: '尺寸' })
    boardSize = 7;

    @property({ displayName: '无尽模式', tooltip: '无尽模式下，达到 2048 游戏不会结束' })
    infinite: boolean = false;

    @property({ displayName: '播放合成动画' })
    animation: boolean = true;

    @property({ type: AIStrategy, displayName: 'AI 策略' })
    aiStrategy = AIStrategy.AlphaBeta;

    @property({
        type: DepthStrategy,
        displayName: 'Alpha Beta 搜索深度策略',
        visible: function () {
            return this.aiStrategy === AIStrategy.AlphaBeta
        }
    })
    depthStrategy = DepthStrategy.Time;

    @property({
        displayName: '搜索时间限制（毫秒）',
        visible: function () {
            return this.aiStrategy === AIStrategy.AlphaBeta &&
                this.depthStrategy == DepthStrategy.Time
        }
    })
    limitTime = 100;

    @property({
        displayName: 'Expectimax 搜索深度',
        visible: function () {
            return this.aiStrategy === AIStrategy.Expectimax
        }
    })
    expectimaxDepth = 8;

    #board: GameBoardView;
    #gameData: GameData;

    #backgroundNode: Node;

    #overPrompt: Node;
    #overPromptText: RichText;
    #overPromptButton: ColorButton;

    #aiButton: ColorButton;
    #stopButton: ColorButton;

    #inputManager: InputManager;
    #aiInputAgent: AIInputProtocol;
    #audioManager: AudioManager;

    #isBusy: boolean = false;
    #isOver: boolean = false;
    #inputs: Direction[] = [];

    #isAI: boolean = false;

    #auto: boolean = false;

    get #boardContentSize(): Size {
        let width = this.node.getComponent(UITransform).width;
        let boardWidth = width - 2 * GridInsets;
        return new Size(boardWidth, boardWidth);
    }

    onLoad() {
        this.#gameData = new GameData();
        this.#gameData.neverWin = this.infinite;

        this.#setupAI();

        game.on(Game.EVENT_HIDE, this.#onAppEnterBackground, this);
    }

    #setupAI() {
        switch (this.aiStrategy) {
            case AIStrategy.AlphaBeta:
                this.#aiInputAgent = AlphaBetaAIInputAgent;
                break;
        }
    }

    #onAppEnterBackground() {
        /// 游戏进入后台，保存当前游戏数据
        this.#gameData?.synchronize();
    }

    onDestroy() {
        this.#inputManager?.unsubscribe(this);
        this.#inputManager?.destroy();
    }

    start() {
        this.#configureGameProperties();
        this.#createGameContent();
        this.#configureInput();
        this.#createOverPrompt();
        this.#configureGameData();

        // UI
        this.#createLogoText();
        this.#createPromptText();
        this.#createBestScoreLabel();
        this.#createScoreLabel();
        this.#createAIButtons();
        this.#createRestartButton();
        this.#createCreditText();

        if (this.debug) {
            this.#createBenchmarkButton();
            this.#createAutoRunButton();
        }

        this.#configureAudio();

        this.#setupStates();
        this.#board.restart();
    }

    #setupStates() {
        this.#inputs = [];
        this.#isBusy = false;
        this.#isOver = false;
        this.#stopAI();
    }

    #configureGameProperties() {
        this.#backgroundNode = new Node();
        this.#backgroundNode.name = 'background';
        this.#backgroundNode.setParent(this.node, false);
        let size = this.node.getComponent(UITransform).contentSize;
        let colorGraphics = this.#backgroundNode.addComponent(ColorGraphics);
        this.#backgroundNode.getComponent(UITransform).contentSize = new Size(size.width, size.height + 500);
        colorGraphics.color = new Color(HEXColor.Background);
    }

    #createGameContent() {
        // 棋盘
        let boardNode = new Node();
        boardNode.name = 'board';
        boardNode.setParent(this.#backgroundNode, false);
        this.#board = boardNode.addComponent(GameBoardView);
        this.#board.audioPlayer = this;
        this.#board.scheduler = this;
    }

    #configureInput() {
        // 关闭多点触摸
        macro.ENABLE_MULTI_TOUCH = false;

        let node = new Node();
        node.name = 'input';
        node.setParent(this.#backgroundNode, false);
        node.addComponent(UITransform);

        let widget = node.addComponent(Widget);
        widget.target = this.#backgroundNode;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.isAlignTop = true;
        widget.isAlignBottom = true;

        this.#inputManager = node.addComponent(InputManager);
        this.#inputManager?.subscribe(this);
    }

    #createOverPrompt() {
        this.#overPrompt = new Node();
        this.#overPrompt.name = 'over_prompt';
        this.#overPrompt.setParent(this.#backgroundNode, false);
        let transform = this.#overPrompt.addComponent(UITransform);
        transform.contentSize = this.#boardContentSize;

        let graphics = this.#overPrompt.addComponent(ColorGraphics);
        let color = new Color(Color.WHITE);
        color.a = 130;
        graphics.color = color;
        graphics.radius = RoundRectRadius;

        let promptText = new Node();
        promptText.addComponent(UITransform);
        promptText.name = 'over_prompt_text';
        promptText.setParent(this.#overPrompt, false);
        promptText.position = v3(0, 100);

        this.#overPromptText = promptText.addComponent(RichText);
        this.#overPromptText.fontSize = 120;
        this.#overPromptText.lineHeight = 120;
        this.#overPromptText.fontFamily = 'Lato';
        this.#overPromptText.string = `<color=${TextColor}><b>You win!</b></color>`;

        this.#overPromptButton = ColorButton.new();
        this.#overPromptButton.node.name = 'over_prompt_button';
        let btnTransform = this.#overPromptButton.getComponent(UITransform);
        btnTransform.contentSize = new Size(300, 120);
        this.#overPromptButton.node.setParent(this.#overPrompt, false);
        this.#overPromptButton.node.position = v3(0, -80);

        this.#overPromptButton.graphics.color = new Color(ButtonColor);
        this.#overPromptButton.graphics.radius = RoundRectRadius;

        this.#overPromptButton.node.on(Button.EventType.CLICK, _ => {
            this.#restart();
        });

        let closeButton = new Node();
        closeButton.name = 'close_button';
        closeButton.setParent(this.#overPrompt, false);
        closeButton.position = v3(transform.contentSize.width * 0.5 - 20, transform.contentSize.height * 0.5 - 20);
        let closeButtonTransform = closeButton.addComponent(UITransform);
        closeButtonTransform.contentSize = new Size(50, 50);
        closeButtonTransform.anchorPoint = Vec2.ONE;
        closeButton.addComponent(Button);
        closeButton.on(Button.EventType.CLICK, _ => {
            this.#hideOverPrompt();
        });

        let btnGraphics = closeButton.addComponent(Graphics);
        btnGraphics.clear();
        btnGraphics.lineWidth = 8;
        btnGraphics.strokeColor = Color.RED;
        btnGraphics.moveTo(-closeButtonTransform.width, -closeButtonTransform.height);
        btnGraphics.lineTo(0, 0);
        btnGraphics.moveTo(0, -closeButtonTransform.height);
        btnGraphics.lineTo(-closeButtonTransform.width, 0);
        btnGraphics.stroke();

        this.#hideOverPrompt();
    }

    #configureGameData() {
        this.#gameData.boardModel.initBoardGridInfos(this.#boardContentSize, this.boardSize, GridInsets);
        this.#board.gameData = this.#gameData;

        this.#board.configure(this.#boardContentSize.width);
    }

    #createLogoText() {
        let node = new Node();
        node.name = 'logo_text';
        let transform = node.addComponent(UITransform);
        transform.anchorPoint = Vec2.ZERO;
        node.setParent(this.node, false);

        let text = node.addComponent(RichText);
        text.fontSize = 100;
        text.lineHeight = 100;
        text.fontFamily = 'Lato';
        text.string = `<color=${TextColor}><b>2048</b></color>`;
        node.position = v3(-this.#boardContentSize.width * 0.5 + 5, this.#boardContentSize.height * 0.5 + 50);
    }

    #createPromptText() {
        let node = new Node();
        node.name = 'prompt_text';
        let transform = node.addComponent(UITransform);
        transform.anchorPoint = Vec2.ZERO;
        node.setParent(this.node, false);

        let text = node.addComponent(RichText);
        text.fontSize = 25;
        text.lineHeight = 25;
        text.verticalAlign = VerticalTextAlignment.BOTTOM;
        text.fontFamily = 'Lato';
        text.string = `<color=${TextColor}>Join the tiles, get to <b>2048!</b></color>`;
        node.position = v3(-this.#boardContentSize.width * 0.5 + 5, this.#boardContentSize.height * 0.5 + 5);
    }

    #createScoreLabel() {
        let score = GameScoreNode.new();
        score.node.name = 'score';
        score.node.setParent(this.node);
        let transform = score.getComponent(UITransform);
        transform.anchorPoint = v2(1, 0);
        transform.contentSize = new Size(150, 80);
        score.node.position = v3(this.#boardContentSize.width * 0.5, this.#boardContentSize.height * 0.5 + 10);

        score.prompt = 'SCORE';
        this.#gameData.observeOn('score', (point: number) => {
            score.score = point;
        });
    }

    #createBestScoreLabel() {
        let score = GameScoreNode.new();
        score.node.name = 'best';
        score.node.setParent(this.node);
        let transform = score.getComponent(UITransform);
        transform.anchorPoint = v2(1, 0);
        transform.contentSize = new Size(150, 80);
        score.node.position = v3(this.#boardContentSize.width * 0.5, this.#boardContentSize.height * 0.5 + 100);

        score.prompt = 'BEST';
        this.#gameData.observeOn('best', (point: number) => {
            score.score = point;
        });
    }

    #createAIButtons() {
        let size: Readonly<Size> = new Size(150, 80);

        let aiBtn = ColorButton.new();
        aiBtn.node.name = 'ai_button';
        aiBtn.node.setParent(this.node);
        let aiBtnTransform = aiBtn.getComponent(UITransform);
        aiBtnTransform.contentSize = size;
        aiBtnTransform.node.position = v3(this.#boardContentSize.width * 0.5 - 245, this.#boardContentSize.height * 0.5 + 50);

        aiBtn.graphics.color = new Color(ButtonColor);
        aiBtn.graphics.radius = RoundRectRadius;

        aiBtn.richText.string = 'Auto-Run';
        aiBtn.richText.fontSize = 30;
        this.#aiButton = aiBtn;

        aiBtn.node.on(Button.EventType.CLICK, _ => {
            if (this.#isAI || this.#isOver) {
                return;
            }
            this.#startAI();
        });

        let stopBtn = ColorButton.new();
        stopBtn.node.name = 'stop_button';
        stopBtn.node.setParent(this.node);
        stopBtn.node.active = false;
        let stopBtnTransform = stopBtn.getComponent(UITransform);
        stopBtnTransform.contentSize = size;
        stopBtnTransform.node.position = v3(this.#boardContentSize.width * 0.5 - 245, this.#boardContentSize.height * 0.5 + 50);

        stopBtn.graphics.color = new Color(ButtonColor);
        stopBtn.graphics.radius = RoundRectRadius;

        stopBtn.richText.string = 'Stop-AI';
        stopBtn.richText.fontSize = 30;
        this.#stopButton = stopBtn;

        stopBtn.node.on(Button.EventType.CLICK, _ => {
            if (!this.#isAI || this.#isOver) {
                return;
            }
            this.#stopAI();
        });

        let hintBtn = ColorButton.new();
        hintBtn.node.name = 'hint_button';
        hintBtn.node.setParent(this.node);
        let hintBtnTransform = hintBtn.getComponent(UITransform);
        hintBtnTransform.contentSize = size;
        hintBtnTransform.node.position = v3(this.#boardContentSize.width * 0.5 - 245, this.#boardContentSize.height * 0.5 + 140);

        hintBtn.graphics.color = new Color(ButtonColor);
        hintBtn.graphics.radius = RoundRectRadius;

        hintBtn.richText.string = 'Hint';
        hintBtn.richText.fontSize = 30;

        hintBtn.node.on(Button.EventType.CLICK, _ => {
            if (this.#isAI || this.#isOver) {
                return;
            }
            this.nextFrameCall(this.#printHint.bind(this));
        });
    }

    #printHint() {
        console.log(direction(this.#aiInput()));
    }

    #aiInput(): Direction {
        let dir = Direction.None;
        let model = this.#gameData.boardModel;
        switch (this.depthStrategy) {
            case DepthStrategy.Time:
                dir = this.#timeCostAIInput(model);
                break;
            case DepthStrategy.Define:
                dir = this.#defineAIInput(model);
                break;
        }
        return dir;
    }

    #timeCostAIInput(model: GameBoardModel): Direction {
        let depth = 1;
        let start = Date.now();
        let direction: Direction = Direction.None;
        do {
            let result = this.#aiInputAgent.search(model, depth);
            if (!isValidDirection(result.direction)) {
                console.log(`search for ${depth} depth, direction is not valid.`);
                break;
            } else if (result.optimalSolution) {
                direction = result.direction;
                break;
            }
            direction = result.direction;
            ++depth;
        } while (Date.now() - start < this.limitTime);
        return direction;
    }

    #defineAIInput(model: GameBoardModel): Direction {
        let depth = 1;
        if (this.#gameData.boardModel.emptyGridsCount > 14) {
            depth = 4;
        } else if (this.#gameData.boardModel.emptyGridsCount > 10) {
            depth = 5;
        } else if (this.#gameData.boardModel.emptyGridsCount > 6) {
            depth = 6;
        } else {
            depth = 7;
        }
        return this.#aiInputAgent.search(model, depth).direction;
    }

    #startAI() {
        this.#isAI = true;
        this.#aiButton.node.active = false;
        this.#stopButton.node.active = true;

        if (this.#inputs.length <= 0) {
            this.nextFrameCall(() => {
                this.#onInputCome(this.#aiInput());
            });
        }
    }

    nextFrameCall(callbackFn: Function) {
        this.scheduleOnce(callbackFn, 0);
    }

    #stopAI() {
        this.#auto = false;
        this.#isAI = false;
        this.#aiButton.node.active = true;
        this.#stopButton.node.active = false;
    }

    #createRestartButton() {
        let colorButton = ColorButton.new();
        colorButton.node.name = 'restart_button';
        let transform = colorButton.getComponent(UITransform);
        transform.anchorY = 1;
        transform.contentSize = new Size(this.#boardContentSize.width, 80);
        colorButton.node.setParent(this.node, false);
        colorButton.node.position = v3(0, -this.#boardContentSize.height * 0.5 - 20);

        colorButton.graphics.color = new Color(ButtonColor);
        colorButton.graphics.radius = RoundRectRadius;

        colorButton.richText.string = 'New Game';

        colorButton.node.on(Button.EventType.CLICK, _ => {
            this.#restart();
        });
    }

    #restart() {
        this.#setupStates();
        this.#gameData.reset();
        this.#board.restart();
        this.#hideOverPrompt();
    }

    #createCreditText() {
        let node = new Node();
        node.name = 'credit_button';
        node.setParent(this.node, false);
        node.position = v3(-this.#boardContentSize.width * 0.5 + 5, -this.#boardContentSize.height * 0.5 - 150);

        let transform = node.addComponent(UITransform);
        transform.anchorPoint = Vec2.ZERO;
        transform.contentSize = new Size(100, 50);

        let buttonText = new Node();
        buttonText.name = 'button_text';
        buttonText.addComponent(UITransform);
        buttonText.setParent(node, false);
        let text = buttonText.addComponent(RichText);
        text.fontSize = 25;
        text.fontFamily = 'Lato';
        text.string = `<color=${TextColor}>Created by <u><b>Gabriele Cirulli.</b></u></color>`;
        text.verticalAlign = VerticalTextAlignment.CENTER;
        text.horizontalAlign = HorizontalTextAlignment.CENTER;
        buttonText.position = v3(0, transform.height * 0.5);

        let layout = node.addComponent(Layout);
        layout.type = Layout.Type.HORIZONTAL;
        layout.resizeMode = Layout.ResizeMode.CONTAINER;
        layout.updateLayout();

        node.addComponent(Button);
        node.on(Button.EventType.CLICK, _ => {
            sys.openURL('http://gabrielecirulli.com/');
        });
    }

    #createBenchmarkButton() {
        let colorButton = ColorButton.new();
        colorButton.node.name = 'benchmark_button';
        let transform = colorButton.getComponent(UITransform);
        transform.anchorY = 1;
        transform.contentSize = new Size(this.#boardContentSize.width * 0.5 - 20, 80);
        colorButton.node.setParent(this.node, false);
        colorButton.node.position = v3(-this.#boardContentSize.width * 0.25, -this.#boardContentSize.height * 0.5 - 155);

        colorButton.graphics.color = new Color(ButtonColor);
        colorButton.graphics.radius = RoundRectRadius;

        colorButton.richText.string = 'Run benchmark';

        colorButton.node.on(Button.EventType.CLICK, _ => {
            this.nextFrameCall(() => {
                this.#runBenchmark();
            });
        });
    }

    #runBenchmark() {
        let benchmark = new Benchmark<GameBoardModel>('2048 AI', 1, 1);
        benchmark.setupFns(() => {
            let model = new GameBoardModel();
            model.initBoardGridInfos(this.#boardContentSize, this.boardSize, GridInsets);
            range(2).forEach(_ => model.next());
            return model;
        }, (model) => {
            this.#benchmarkAction(model);
        }, (model) => {
            return model.win;
        }, (model) => {
            console.log(model);
        });
        benchmark.run();
    }

    #benchmarkAction(model: GameBoardModel) {
        let data = new GameData();
        data.boardModel = model;
        while (!data.isOver) {
            let direction = this.#timeCostAIInput(data.boardModel);
            data.boardModel.mergeBoardToDirection(direction);
            data.boardModel.tampBoardToDirection(direction);
            data.boardModel.next();
            // console.log(direction);
        }
    }

    #createAutoRunButton() {
        let colorButton = ColorButton.new();
        colorButton.node.name = 'auto_loop_button';
        let transform = colorButton.getComponent(UITransform);
        transform.anchorY = 1;
        transform.contentSize = new Size(this.#boardContentSize.width * 0.5 - 20, 80);
        colorButton.node.setParent(this.node, false);
        colorButton.node.position = v3(this.#boardContentSize.width * 0.25, -this.#boardContentSize.height * 0.5 - 155);

        colorButton.graphics.color = new Color(ButtonColor);
        colorButton.graphics.radius = RoundRectRadius;

        colorButton.richText.string = 'Auto Loop';

        colorButton.node.on(Button.EventType.CLICK, _ => {
            this.nextFrameCall(() => {
                this.#autoRun();
            });
        });
    }

    #autoRun() {
        if (this.#auto) {
            return;
        }
        this.#auto = true;
        this.#startAI();
    }

    #configureAudio() {
        let node = new Node();
        node.name = 'audio';
        node.setParent(this.node, false);
        node.addComponent(UITransform);

        this.#audioManager = node.addComponent(AudioManager);
    }

    playAudio(name: string) {
        this.#audioManager.playAudio(name);
    }

    // #region InputListener
    inputToLeft(): void {
        this.#onUserInput(Direction.Left);
    }

    inputToRight(): void {
        this.#onUserInput(Direction.Right);
    }

    inputToUp(): void {
        this.#onUserInput(Direction.Up);
    }

    inputToDown(): void {
        this.#onUserInput(Direction.Down);
    }
    // #endregion

    #onUserInput(input: Direction) {
        if (this.#isAI) {
            return;
        }

        this.#onInputCome(input);
    }

    #onInputCome(input: Direction) {
        if (this.#isOver) {
            return;
        }

        this.#inputs.push(input);
        this.#consumeInputs();
    }

    #consumeInputs() {
        if (this.#inputs.length <= 0 || this.#isBusy) {
            return;
        }

        let input = this.#inputs.shift();
        if (input === Direction.None) {
            this.#consumeInputs();
            return;
        }

        this.#isBusy = true;
        this.#board.slideToDirection(input, this.animation).then(_ => {
            this.#isBusy = false;
            if (!this.#trySettleGame()) {
                if (this.#isAI && this.#inputs.length <= 0) {
                    this.#inputs.push(this.#aiInput());
                }
                this.#consumeInputs();
            } else {
                console.log(this.#gameData.win ? 'Win!' : 'Lose!');
                let autoRun = this.#auto;
                this.#setupStates();
                this.#gameData.reset();
                this.#isOver = true;

                if (autoRun) {
                    this.#restart();
                    this.#autoRun();
                }
            }
        }).catch(error => {
            this.#inputs = [];
            this.#isBusy = false;
            this.#stopAI();

            console.error(error);
        });
    }

    // 游戏结算
    #trySettleGame(): boolean {
        this.#gameData.win ? this.#showOverPrompt(OverPrompts.Win) : undefined;
        this.#gameData.lose ? this.#showOverPrompt(OverPrompts.Lose) : undefined;
        return this.#gameData.isOver;
    }

    #showOverPrompt(overPrompt: OverPrompt) {
        this.#overPromptText.string = this.#overPromptText.string = `<color=${TextColor}><b>${overPrompt.prompt}</b></color>`;
        this.#overPromptButton.richText.string = `<b>${overPrompt.button_text}</b>`;

        this.#overPrompt.active = true;
        this.#overPrompt.scale = Vec3.ZERO;
        Tween.stopAllByTarget(this.#overPrompt);
        tween(this.#overPrompt)
            .to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' })
            .start();
    }

    #hideOverPrompt() {
        tween(this.#overPrompt)
            .to(0.2, { scale: Vec3.ZERO }, { easing: 'backIn' })
            .call(() => {
                this.#overPrompt.active = false;
            })
            .start();
    }
}
