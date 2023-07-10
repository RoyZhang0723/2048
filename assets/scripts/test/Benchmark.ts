// 1. 多次执行
// 2. 执行测试的平均时间
// 3. 测试通过率
export default class Benchmark<T> {
    #name: string = '';

    #runIntervals: number[] = [];
    #isRunning: boolean = false;

    // 通过测试次数
    #passTimes: number = 0;
    // 运行测试次数
    #runTimes: number = 0;

    // 目标测试次数
    #targetRunTimes: number = 1;
    // 目标测试通过率
    #targetPassRate: number = 1;

    // 准备函数
    #prepareFn: () => T;
    // 测试
    #runFn: (data: T) => void;
    // 通过测试条件
    #passConditionFn: (data: T) => boolean;
    // 每次运行后的回调
    #tickFn: (data: T) => void;

    // 是否结束
    get #isOver(): boolean {
        return this.#runTimes >= this.#targetRunTimes;
    }

    constructor(name: string, runTimes: number, passTimes: number) {
        this.#name = name;
        this.#targetRunTimes = runTimes;
        this.#targetPassRate = passTimes / runTimes;
    }

    setupFns(prepareFn: () => T,
        runFn: (data: T) => void,
        passFn: (data: T) => boolean,
        tickFn?: (data: T) => void) {
        this.#prepareFn = prepareFn;
        this.#runFn = runFn;
        this.#passConditionFn = passFn;
        this.#tickFn = tickFn;
    }

    run() {
        if (this.#isRunning) {
            this.#printError(`Test [${this.#name}] is running.`);
            return;
        }

        this.#isRunning = true;
        this.#run();
        this.#isRunning = false;
    }

    #run() {
        if (!this.#verifyFnsValid()) {
            this.#printError('Functions not set.');
            return;
        }

        if (this.#isOver) {
            this.#print();
            return;
        }

        let startTime = Date.now();
        ++this.#runTimes;
        let data = this.#prepareFn();
        this.#runFn(data);
        if (this.#passConditionFn(data)) {
            ++this.#passTimes;
        }
        this.#runIntervals.push(Date.now() - startTime);
        this.#tickFn && this.#tickFn(data);

        this.#run();
    }

    #print() {
        console.log(`Run test [${this.#name}] ${this.#runTimes} times, pass ${this.#passTimes} times.\nPass rate: ${this.#passRate() * 100}%, ${(this.#passRate() >= this.#targetPassRate ? 'Passed!' : 'Failed!')}\nAverage time: ${this.#averageRunInterval()}ms.`);
    }

    #passRate(): number {
        return this.#passTimes / this.#runTimes;
    }

    #averageRunInterval(): number {
        return this.#runIntervals.reduce((a, b) => a + b) / this.#runTimes;
    }

    #verifyFnsValid(): boolean {
        return this.#runFn !== undefined && this.#passConditionFn !== undefined;
    }

    #printError(error: string) {
        console.error(error);
    }
}
