import { sys } from "cc";

export default abstract class PrefUtils {
    private static prefCache: Map<string, any> = new Map();

    public static setString(key: string, value: string) {
        this.setData(key, value);
    }

    public static getString(key: string, defaultValue?: string) {
        defaultValue = defaultValue ?? "";
        return this.getData(key, defaultValue);
    }

    public static setInt(key: string, value: number) {
        value = value || 0;
        this.setData(key, value + '');
    };

    public static getInt(key: string, defaultValue?: number) {
        defaultValue = defaultValue ?? 0;
        let val = this.getData(key, defaultValue);
        return parseInt(val);
    }

    public static setBool(key: string, value: boolean) {
        value = value ?? false;
        if (value) {
            this.setInt(key, 1);
        } else {
            this.setInt(key, 0);
        }
    }

    public static getBool(key: string, defaultValue?: boolean) {
        defaultValue = defaultValue ?? false;
        let defaultIntValue = 0;
        if (defaultValue) {
            defaultIntValue = 1;
        }
        let intValue = this.getInt(key, defaultIntValue);
        return intValue > 0;
    }

    private static setData(key: string, value: string) {
        this.prefCache.set(key, value);
        sys.localStorage.setItem(key, value);
    }

    private static getData<T>(key: string, defaultValue: T): string {
        let val = this.prefCache.get(key);
        if (val === undefined || val === null) {
            val = sys.localStorage.getItem(key);
            this.prefCache.set(key, val);
        }

        if ((val === undefined || val === null || val === "") && defaultValue !== null && defaultValue !== undefined) {
            val = defaultValue;
        }
        return val;
    }

    public static clearData(key: string) {
        this.prefCache.delete(key);
        sys.localStorage.removeItem(key);
    }

    public static clearAll() {
        this.prefCache.clear();
        sys.localStorage.clear();
    }
}
