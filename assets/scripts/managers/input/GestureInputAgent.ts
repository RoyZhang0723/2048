import { EventTouch, misc, v2, Vec2 } from "cc";
import { InputAgent } from "./InputProtocol";

const MOVE_THRESHOLD = 20;

export default class GestureInputAgent extends InputAgent {
    #directionMethods: Map<Vec2, Function>;

    protected onInit(): void {
        this.#directionMethods = new Map();
        this.#directionMethods.set(Vec2.UNIT_X, this.listener.inputToRight);
        this.#directionMethods.set(v2(Vec2.UNIT_X).negative(), this.listener.inputToLeft);
        this.#directionMethods.set(Vec2.UNIT_Y, this.listener.inputToUp);
        this.#directionMethods.set(v2(Vec2.UNIT_Y).negative(), this.listener.inputToDown);
    }

    protected onUpdate(dt: number): void { }

    protected onDeinit(): void {
        this.#directionMethods.clear();
        this.#directionMethods = null;
    }

    onTouchEnd(event: EventTouch): void {
        let touch = event.touch;
        let moveDelta = touch.getUILocation();
        moveDelta.subtract(touch.getUIStartLocation());

        if (this.#reachMoveThreshold(moveDelta)) {
            moveDelta = moveDelta.normalize();
            this.#directionMethods.forEach((method, direction) => {
                if (this.#isSameDirection(moveDelta, direction)) {
                    method.apply(this.listener);
                }
            });
        }
    }

    #reachMoveThreshold(moveDelta: Vec2): boolean {
        return moveDelta.length() >= MOVE_THRESHOLD;
    }

    #isSameDirection(moveDelta: Vec2, direction: Vec2): boolean {
        let radian = moveDelta.signAngle(direction);
        let angle = misc.radiansToDegrees(radian);
        return -45 <= angle && angle <= 45;
    }
}
