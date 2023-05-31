import { ClientSession } from 'mongoose';

import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { SystemEndpoints } from '@ledger/models/Endpoints';
import { UpdateFundsRequest, SysBalanceResponse } from '@ledger/models/SystemRequest';
import { ISystem } from '@db/models/System';
import { SystemOpProvider } from '@db/providers/SystemOpProvider';


export class SystemProvider implements SystemEndpoints {
  private sysOpProvider: SystemOpProvider;
  constructor(private ledgerDb: LedgerMongooseProvider, private sysId: string) {
    this.sysOpProvider = new SystemOpProvider(this.ledgerDb);
  }

  async getBalance(session?: ClientSession): Promise<SysBalanceResponse> {
    const sysObj: ISystem = await this.sysOpProvider.findOne({ query: { sysId: this.sysId }, session });
    return { balance: sysObj.balance };
  }
  
  async updateFunds(opts: UpdateFundsRequest, session?: ClientSession): Promise<boolean> {
    const updateBalance = (prev: number, update: number) => opts.operation === 'add' ? prev + update : prev - update;
    const currSys: ISystem = await this.sysOpProvider.findOne({ query: { sysId: this.sysId }, session });

    if (currSys.balance >= opts.transactionSize) {
      await this.sysOpProvider.findOneAndUpdate({
        query: {
          filter: { sysId: this.sysId },
          update: { $set: { balance: updateBalance(currSys.balance, opts.transactionSize) }}
        },
        session
      });

      return true;
    }

    return false;
  }
}