import { _decorator, Component, Node, Color, Label, tween, v3, Vec3, UITransform, Widget } from 'cc';
import ColorGraphics from '../components/ColorGraphics';
import { HEXColor } from '../defines/ColorDefine';

const { ccclass, requireComponent } = _decorator;

@ccclass('GameScoreNode')
@requireComponent(ColorGraphics)
export class GameScoreNode extends Component {
    static new(): GameScoreNode {
        let node = new Node();
        return node.addComponent(GameScoreNode);
    }

    // #region Properties
    // private
    #scoreLabel: Label;
    #promptLabel: Label;
    #colorGraphics: ColorGraphics;
    // #endregion

    // #region Setter
    set prompt(prompt: string) {
        this.#promptLabel.string = prompt;
    }

    set score(score: number) {
        this.#scoreLabel.string = `${score}`;
    }
    // #endregion

    onLoad() {
        this.#colorGraphics = this.getComponent(ColorGraphics);
        this.#colorGraphics.color = new Color(HEXColor.DarkGray);
        this.#colorGraphics.radius = 5;

        this.#promptLabel = this.#createPromptLabel();
        this.#scoreLabel = this.#createScoreLabel();
    }

    #createPromptLabel(): Label {
        let labelNode = new Node();
        labelNode.name = "prompt";
        labelNode.setParent(this.node, false);

        let label = labelNode.addComponent(Label);
        label.color = new Color(HEXColor.Background);
        label.fontFamily = 'Helvetica-Bold';
        label.fontSize = 20;
        label.lineHeight = 20;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        let widget = labelNode.addComponent(Widget);
        widget.target = this.node;
        widget.isAlignHorizontalCenter = true;
        widget.isAlignTop = true;
        widget.top = 5;

        return label;
    }

    #createScoreLabel(): Label {
        let labelNode = new Node();
        labelNode.name = "score";
        labelNode.setParent(this.node, false);

        let label = labelNode.addComponent(Label);
        label.color = new Color(HEXColor.Background);
        label.fontFamily = 'Helvetica-Bold';
        label.fontSize = 35;
        label.lineHeight = 35;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        let widget = labelNode.addComponent(Widget);
        widget.target = this.node;
        widget.isAlignHorizontalCenter = true;
        widget.isAlignBottom = true;
        widget.bottom = 8;

        return label;
    }
}
