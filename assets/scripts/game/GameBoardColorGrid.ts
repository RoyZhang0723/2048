import { _decorator, Component, Node, Color } from 'cc';
import ColorGraphics from '../components/ColorGraphics';
import { RoundRectRadius } from '../defines/GameDefine';

const { ccclass, requireComponent } = _decorator;

@ccclass('GameBoardColorGrid')
@requireComponent(ColorGraphics)
export class GameBoardColorGrid extends Component {
    static new(): GameBoardColorGrid {
        let node = new Node();
        return node.addComponent(GameBoardColorGrid);
    }

    #colorGraphics: ColorGraphics;

    onLoad() {
        this.#colorGraphics = this.getComponent(ColorGraphics);
    }

    configure(color: Color) {
        this.#colorGraphics.color = color;
        this.#colorGraphics.radius = RoundRectRadius;
    }
}
