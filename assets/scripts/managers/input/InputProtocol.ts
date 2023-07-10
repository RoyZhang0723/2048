import { EventTouch } from "cc";

export interface InputListener {
    inputToLeft(): void;
    inputToRight(): void;
    inputToUp(): void;
    inputToDown(): void;
}

export abstract class InputAgent {
    protected listener: InputListener;

    init(listener: InputListener) {
        this.listener = listener;
        this.onInit();
    }

    update(deltaTime: number) {
        this.onUpdate(deltaTime);
    }

    deinit() {
        this.onDeinit();
    }

    protected abstract onInit(): void;
    protected abstract onUpdate(dt: number): void;
    protected abstract onDeinit(): void;

    onTouchStart(event: EventTouch) { }
    onTouchMove(event: EventTouch) { }
    onTouchEnd(event: EventTouch) { }
}
