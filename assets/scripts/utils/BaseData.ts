const KVO_KEY = 'com.kvo.key';

interface Observer {
    action: Function;
    target?: any;
}

let swizzle = (target: any, propertyKey: string) => {
    const kvo = target[KVO_KEY] ?? {};
    if (kvo[propertyKey]) {
        return;
    }

    kvo[propertyKey] = true;
    target[KVO_KEY] = kvo;

    const cacheKey = Symbol();
    Reflect.defineProperty(target, propertyKey, {
        set(value) {
            if (!target.__watcher__ || !(target.__watcher__ instanceof Map)) {
                return;
            }

            let cache = target[cacheKey];
            if (!cache) {
                cache = {};
                target[cacheKey] = cache;
            }

            if (value === cache[propertyKey]) { // 值不变，直接返回
                return;
            }

            let pre = cache[propertyKey];
            cache[propertyKey] = value;

            const observers = target.__watcher__.get(propertyKey) as Array<Observer>;
            observers.forEach(observer => {
                if (typeof observer.action === 'function') {
                    observer.action.call(observer.target, value, pre);
                }
            });
        },
        get() {
            let cache = target[cacheKey];
            return cache ? cache[propertyKey] : undefined;
        }
    });
};

export default abstract class BaseData {
    private __watcher__: Map<string, Array<Observer>> = new Map();

    observeOn(propertyName: string, action: Function, target?: any) {
        let goNext = this.#tryNextLevelObserveAction(propertyName, (obj, name) => {
            obj.observeOn(name, action, target);
        });
        if (!goNext) {
            this.#addObserver(propertyName, action, target);
        }
    }

    #addObserver(propertyName: string, action: Function, target?: any) {
        let observers = this.__watcher__.get(propertyName) ?? [];
        let index = observers.findIndex(observer => observer.action === action);
        if (index < 0) {
            observers.push({
                action: action,
                target: target
            });
        } else {
            observers[index].target = target;
        }
        this.__watcher__.set(propertyName, observers);

        let value = this[propertyName];
        swizzle(this, propertyName);
        this[propertyName] = value;
    }

    observeOff(propertyName: string, action: Function) {
        let goNext = this.#tryNextLevelObserveAction(propertyName, (obj, name) => {
            obj.observeOff(name, action);
        });
        if (!goNext) {
            this.#removeObserver(propertyName, action);
        }
    }

    #removeObserver(propertyName: string, action: Function) {
        if (this.__watcher__.has(propertyName)) {
            let observers = this.__watcher__.get(propertyName);
            let index = observers.findIndex(observer => observer.action === action);
            index < 0 ? '' : observers.splice(index, 1);
        }
    }

    #tryNextLevelObserveAction(propertyName: string,
        excutor: (obj: BaseData, name: string) => void): boolean {
        let dotIndex = propertyName.indexOf('.');
        if (dotIndex >= 0) {
            let property = propertyName.substring(0, dotIndex);
            let obj = this[property];
            if (obj instanceof BaseData) {
                let nextPropertyName = propertyName.substring(dotIndex + 1);
                excutor(obj, nextPropertyName);
            }
            return true;
        }
        return false;
    }
}
