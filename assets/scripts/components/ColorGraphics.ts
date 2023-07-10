import { Color, Component, Graphics, Node, Rect, Size, UITransform, v2, _decorator } from "cc";

const { ccclass, property, requireComponent, menu, executeInEditMode } = _decorator;

@ccclass('ColorGraphics')
@requireComponent(Graphics)
@requireComponent(UITransform)
@menu('Component/ColorGraphics')
@executeInEditMode(true)
export default class ColorGraphics extends Component {
    @property({})
    private editorColor: Color = new Color(Color.WHITE);

    @property({ step: 1 })
    private editorRadius: number = 0;

    #dirty: boolean = false;

    set color(value: Color) {
        this.#dirty = !this.editorColor.equals(value);
        this.editorColor.set(value);
        this.redraw();
    }

    set radius(value: number) {
        this.#dirty = this.editorRadius !== value;
        this.editorRadius = value;
        this.redraw();
    }

    onLoad() {
        this.node.on(Node.EventType.SIZE_CHANGED, this.#onSizeChanged, this);
    }

    #onSizeChanged() {
        this.#dirty = true;
        this.redraw();
    }

    redraw() {
        if (!this.#dirty) {
            return;
        }

        this.#dirty = false;

        let transform = this.getComponent(UITransform);
        let rect = new Rect();
        rect.size = new Size(transform.width, transform.height);
        rect.center = v2(transform.width * 0.5 - transform.width * transform.anchorX,
            transform.height * 0.5 - transform.height * transform.anchorY);

        let graphics = this.getComponent(Graphics);
        graphics.clear();
        graphics.roundRect(rect.xMin, rect.yMin, rect.width, rect.height, this.editorRadius);

        graphics.fillColor.set(this.editorColor);
        graphics.fill();
        graphics.stroke();
    }

    onDestroy() {
        this.node.off(Node.EventType.SIZE_CHANGED, this.#onSizeChanged, this);
    }
}
