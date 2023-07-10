import { Component, Constructor, EventTouch, Node } from "cc";
import GestureInputAgent from "./GestureInputAgent";
import { InputAgent, InputListener } from "./InputProtocol";
import KeyboardInputAgent from "./KeyboardInputAgent";

export default class InputManager extends Component implements InputListener {
    #agents: InputAgent[] = [];
    #listeners: InputListener[] = [];

    start() {
        this.#registerAgent(GestureInputAgent);
        this.#registerAgent(KeyboardInputAgent);

        this.#registerListeners();
    }

    #registerAgent(agentClass: Constructor<InputAgent>) {
        let agent = new agentClass();
        if (agent) {
            agent.init(this);
            this.#agents.push(agent);
        }
    }

    #registerListeners() {
        this.node.on(Node.EventType.TOUCH_START, this.#onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.#onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.#onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.#onTouchEnd, this);
    }

    update(dt: number) {
        this.#agents.forEach(agent => agent.update(dt));
    }

    onEnable() {
        this.#registerListeners();
    }

    onDisable() {
        this.#unregisterListeners();
    }

    #unregisterListeners() {
        this.node.off(Node.EventType.TOUCH_START, this.#onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.#onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.#onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.#onTouchEnd, this);
    }

    onDestroy() {
        this.#unregisterListeners();

        this.#agents.forEach(agent => agent.deinit());
        this.#agents = [];
    }

    subscribe(listener: InputListener) {
        listener ? this.#listeners.push(listener) : undefined;
    }

    unsubscribe(listener: InputListener) {
        if (listener) {
            let index = this.#listeners.indexOf(listener);
            index >= 0 ? this.#listeners.splice(index, 1) : undefined;
        }
    }

    // #region Touch Event
    #onTouchStart(event: EventTouch) {
        this.#agents.forEach(agent => agent.onTouchStart(event));
    }

    #onTouchMove(event: EventTouch) {
        this.#agents.forEach(agent => agent.onTouchMove(event));
    }

    #onTouchEnd(event: EventTouch) {
        this.#agents.forEach(agent => agent.onTouchEnd(event));
    }
    // #endregion

    // #region InputListener
    inputToLeft(): void {
        this.#listeners.forEach(listener => listener.inputToLeft());
    }

    inputToRight(): void {
        this.#listeners.forEach(listener => listener.inputToRight());
    }

    inputToUp(): void {
        this.#listeners.forEach(listener => listener.inputToUp());
    }

    inputToDown(): void {
        this.#listeners.forEach(listener => listener.inputToDown());
    }
    // #endregion
}
