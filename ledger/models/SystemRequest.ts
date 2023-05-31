import { ISystem } from '@db/models/System';


export type SysBalanceResponse = Pick<ISystem, 'balance'>;

type SysOps = 'add' | 'subtract';
export interface UpdateFundsRequest {
  operation: SysOps;
  transactionSize: number;
}

export type SystemRequests = UpdateFundsRequest;