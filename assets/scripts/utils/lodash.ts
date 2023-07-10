export function range(startOrCount: number, end?: number): number[] {
    if (startOrCount < 0) {
        return [];
    }

    if (end === null || end === undefined) {
        end = startOrCount;
        startOrCount = 0;
    }

    if (startOrCount > end) {
        return [];
    }

    let res = Array.from(Array(end).keys());
    let index = res.indexOf(startOrCount);
    if (index < 0) {
        return [];
    }

    res.splice(0, index);
    return res;
}

type GroupByKeyTransformer<T = any> = (value: T, index?: number, array?: T[]) => string;
export function groupBy<T = any>(array: T[], fn: GroupByKeyTransformer<T>): Map<string, T[]> {
    return array.map(fn).reduce((pre, cur, i) => {
        if (!pre.has(cur)) {
            pre.set(cur, []);
        }
        pre.set(cur, pre.get(cur).concat(array[i]));
        return pre;
    }, new Map<string, T[]>());
}

export function shuffle<T = any>(array: T[]): T[] {
    let res = array.slice();
    let length = res.length;
    while (length) {
        let i = Math.floor(Math.random() * length--);
        [res[length], res[i]] = [res[i], res[length]];
    }
    return res;
}

export function pick<T = any>(array: T[], count = 1): T[] {
    let a = shuffle(array);
    return count > a.length ? [] : a.slice(0, count);
}

export function randomInt(minOrMax: number, max?: number): number {
    if (max === undefined || max === null) {
        max = minOrMax;
        minOrMax = 0;
    }

    if (max < minOrMax) {
        return NaN;
    }

    return Math.floor(Math.random() * (max - minOrMax) + minOrMax);
}

export function timeTaken(callback: Function, name?: string): any {
    const id = `timeTaken_${name || callback.name}`;
    console.time(id);
    const r = callback();
    console.timeEnd(id);
    return r;
}
