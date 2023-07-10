import { Button, Component, HorizontalTextAlignment, Node, RichText, UITransform, v3, VerticalTextAlignment, Widget, _decorator } from "cc";
import ColorGraphics from "./ColorGraphics";

const { ccclass, requireComponent } = _decorator;

@ccclass
@requireComponent(Button)
@requireComponent(UITransform)
export default class ColorButton extends Component {
    static new(): ColorButton {
        let node = new Node();
        return node.addComponent(ColorButton);
    }

    #richText: RichText;

    get graphics(): ColorGraphics {
        return this.getComponent(ColorGraphics);
    }

    get richText(): RichText {
        return this.#richText;
    }

    onLoad() {
        this.addComponent(ColorGraphics);

        let button = this.getComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;

        let buttonText = new Node();
        buttonText.name = 'text';
        buttonText.addComponent(UITransform);
        buttonText.setParent(button.node, false);

        let textWidget = buttonText.addComponent(Widget);
        textWidget.target = button.node;
        textWidget.isAlignVerticalCenter = true;
        textWidget.isAlignHorizontalCenter = true;

        this.#richText = buttonText.addComponent(RichText);
        this.#richText.fontSize = 40;
        this.#richText.lineHeight = 40;
        this.#richText.fontFamily = 'Lato';
        this.#richText.verticalAlign = VerticalTextAlignment.CENTER;
        this.#richText.horizontalAlign = HorizontalTextAlignment.CENTER;
    }
}
