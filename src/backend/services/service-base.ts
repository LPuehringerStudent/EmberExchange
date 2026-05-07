import { ITypedStatement, Unit } from "../utils/unit";

export abstract class ServiceBase {

    protected constructor(protected readonly unit: Unit) {}

    protected async executeStmt(stmt: ITypedStatement): Promise<[success: boolean, id: number]> {
        const result = await stmt.run();
        const id: number = await this.unit.getLastRowId();
        return [result.changes === 1, id];
    }
}
