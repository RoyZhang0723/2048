import { EventKeyboard, Input, input, KeyCode } from "cc";
import { InputAgent } from "./InputProtocol";

const ACCEPT_KEYCODE = new Set([
    KeyCode.ARROW_UP,
    KeyCode.ARROW_DOWN,
    KeyCode.ARROW_LEFT,
    KeyCode.ARROW_RIGHT,
    KeyCode.KEY_W,
    KeyCode.KEY_S,
    KeyCode.KEY_A,
    KeyCode.KEY_D
]);

export default class KeyboardInputAgent extends InputAgent {
    protected onInit(): void {
        input.on(Input.EventType.KEY_DOWN, this.#onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.#onKeyUp, this);
    }

    #onKeyDown(event: EventKeyboard) {
        if (!ACCEPT_KEYCODE.has(event.keyCode)) {
            return;
        }

        switch (event.keyCode) {
            case KeyCode.ARROW_UP:
            case KeyCode.KEY_W:
                this.listener.inputToUp();
                break;
            case KeyCode.ARROW_DOWN:
            case KeyCode.KEY_S:
                this.listener.inputToDown();
                break;
            case KeyCode.ARROW_LEFT:
            case KeyCode.KEY_A:
                this.listener.inputToLeft();
                break;
            case KeyCode.ARROW_RIGHT:
            case KeyCode.KEY_D:
                this.listener.inputToRight();
                break;
        }
    }

    #onKeyUp(event: EventKeyboard) {
        if (!ACCEPT_KEYCODE.has(event.keyCode)) {
            return;
        }
    }

    protected onDeinit(): void {
        input.off(Input.EventType.KEY_DOWN, this.#onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.#onKeyUp, this);
    }

    protected onUpdate(dt: number): void { }
}
