import { _decorator, Component, Node, Color, Label, tween, v3, Vec3, Widget } from 'cc';
import ColorGraphics from '../components/ColorGraphics';
import { PointColor, PointFontColor } from '../defines/ColorDefine';
import { AnimationFrameInterval, RoundRectRadius } from '../defines/GameDefine';
import GameBoardGridModel from './GameBoardGridModel';

const { ccclass, requireComponent } = _decorator;

@ccclass('GameBoardPointGrid')
@requireComponent(ColorGraphics)
export class GameBoardPointGrid extends Component {
    static new(): GameBoardPointGrid {
        let node = new Node();
        return node.addComponent(GameBoardPointGrid);
    }

    // #region Properties
    point: number = 0;

    x: number = 0;
    y: number = 0;

    // private
    #pointLabel: Label;
    #colorGraphics: ColorGraphics;
    // #endregion

    // #region Getter
    get #pointColorIndex(): number {
        return Math.floor(Math.log2(this.point));
    }
    // #endregion

    onLoad() {
        this.#colorGraphics = this.getComponent(ColorGraphics);
        this.#pointLabel = this.#createPointLabel();
    }

    #createPointLabel(): Label {
        let labelNode = new Node();
        labelNode.name = "point";
        labelNode.setParent(this.node, false);
        let label = labelNode.addComponent(Label);
        label.fontFamily = 'Helvetica-Bold';
        label.fontSize = 60;
        label.lineHeight = 60;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.cacheMode = Label.CacheMode.CHAR;
        label.enableWrapText = true;
        label.overflow = Label.Overflow.SHRINK;

        let widget = labelNode.addComponent(Widget);
        widget.isAlignLeft = true;
        widget.left = 10;
        widget.isAlignRight = true;
        widget.right = 10;
        widget.isAlignTop = true;
        widget.top = 10;
        widget.isAlignBottom = true;
        widget.bottom = 10;

        return label;
    }

    #updateName() {
        this.node.name = `point_grid_${this.x}_${this.y}`;
    }

    updatePoint(point: number) {
        this.point = point;
        this.#pointLabel.string = point.toString();
        this.#pointLabel.color = new Color(point <= 4 ? PointFontColor[0] : PointFontColor[1]);

        let index = Math.min(PointColor.length, this.#pointColorIndex);
        this.#colorGraphics.color = new Color(PointColor[index]);
        this.#colorGraphics.radius = RoundRectRadius;

        this.#updateName();
    }

    appearIn(): Promise<void> {
        this.node.scale = Vec3.ZERO;
        return new Promise<void>(resolve => {
            tween(this.node)
                .delay(7 * AnimationFrameInterval)
                .to(10 * AnimationFrameInterval, { scale: Vec3.ONE }, { easing: 'cubicOut' })
                .call(() => {
                    resolve();
                })
                .start();
        });
    }

    moveTo(gridModel: GameBoardGridModel): Promise<void> {
        this.x = gridModel.x;
        this.y = gridModel.y;
        this.#updateName();

        return new Promise<void>(resolve => {
            tween(this.node)
                .to(7 * AnimationFrameInterval, { position: v3(gridModel.rect.center.x, gridModel.rect.center.y) }, { easing: 'cubicInOut' })
                .call(() => {
                    resolve();
                })
                .start();
        });
    }

    playMergeAnimation(): Promise<void> {
        this.node.scale = Vec3.ZERO;

        return new Promise<void>(resolve => {
            tween(this.node)
                .delay(6 * AnimationFrameInterval)
                .to(6 * AnimationFrameInterval, { scale: v3(Vec3.ONE).multiplyScalar(1.2) }, { easing: 'cubicOut' })
                .to(5 * AnimationFrameInterval, { scale: Vec3.ONE }, { easing: 'cubicOut' })
                .call(() => {
                    resolve();
                })
                .start();
        });
    }

    isLocatingAt(x: number, y: number): boolean {
        return this.x === x && this.y === y;
    }
}
