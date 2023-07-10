import PrefUtils from "./PrefUtils";
import BaseData from "./BaseData";

/**
 * 基础模型类
 *
 * @export
 * @abstract
 * @class BaseModel
 */
export abstract class BaseModel extends BaseData {
    /**
     * 将信息存储到本地
     *
     * @memberof BaseModel
     */
    synchronize() {
        let synchronizeData = this.dataForSynchronize();
        let synchronizeString = JSON.stringify(synchronizeData);
        PrefUtils.setString(this.synchronizeKey, synchronizeString);
    }

    protected awakeFromDisk() {
        let synchronizeString = PrefUtils.getString(this.synchronizeKey, '{}');
        let synchronizeData = JSON.parse(synchronizeString);
        this.fromDiskJSON(synchronizeData);
    }

    protected get synchronizeKey(): string {
        return '';
    }

    fromDiskJSON(json: any) { }

    dataForSynchronize(): any {
        return {};
    }
}
