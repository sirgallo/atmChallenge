import { ClientSession } from 'mongoose';
import lodash from 'lodash';
const { gte, every } = lodash;

import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { LedgerOpType, ILedgerEntry } from '@db/models/Ledger';
import { LedgerEndpoints } from '@ledger/models/Endpoints';
import { 
  BalanceRequest, BalanceResponse, CreateTransactionRequest, 
  TransactionsRequest, TransactionsResponse 
} from '@ledger/models/LedgerRequest';
import { SystemProvider } from '@ledger/providers/SystemProvider';
import { LedgerOpProvider } from '@db/providers/LedgerOpProvider';


const MAX_DAYS = 30;

export class LedgerProvider implements LedgerEndpoints {
  private ledgerOpProv: LedgerOpProvider;
  constructor(private ledgerDb: LedgerMongooseProvider, private sysProv: SystemProvider) {
    this.ledgerOpProv = new LedgerOpProvider(this.ledgerDb);
  }

  async getBalance(opts: BalanceRequest): Promise<BalanceResponse> {
    const latestTransaction: ILedgerEntry = await this.ledgerOpProv.findOne({ query: { userId: opts.userId }});
    return { totalBalance: latestTransaction?.totalBalance ?? 0 };
  }

  async getTransactions(opts: TransactionsRequest): Promise<TransactionsResponse> {
    const transactions: ILedgerEntry[] = await this.ledgerOpProv.getTransactions({ userId: opts.userId, maxDays: MAX_DAYS });
    return { transactions };
  }

  /*
   need this to be atomic
    --> mongoDb by nature is not atomic
      but wrapping transactions in sessions creates atomicity
  */
  async createTransaction(opts: CreateTransactionRequest): Promise<ILedgerEntry> {
    const calcNewBalance = (op: LedgerOpType, size: number, prev: number): number => op === 'withdraw' ? prev - size : prev + size;
    const currSession: ClientSession = await this.ledgerDb.conn.startSession();
    currSession.startTransaction();

    const prevTransaction: ILedgerEntry = await this.ledgerOpProv.findOne({ query: { userId: opts.userId }, session: currSession });
    const totalBalance = prevTransaction 
      ? calcNewBalance(opts.operation, opts.transactionSize, prevTransaction.totalBalance) 
      : opts.transactionSize;

    const newEntry: ILedgerEntry = {
      userId: opts.userId,
      operation: opts.operation,
      transactionSize: opts.transactionSize,
      totalBalance
    };

    const insertedDoc = await (async (): Promise<ILedgerEntry> => {
      if (every([ opts.operation === 'withdraw', gte(prevTransaction?.totalBalance ?? 0, 0) ])) {
        const didUpdate = await this.sysProv.updateFunds({ operation: 'subtract', transactionSize: opts.transactionSize }, currSession);
        if (didUpdate) {
          newEntry.totalBalance = newEntry.transactionSize > totalBalance ? totalBalance - 5 : totalBalance;
          return this.ledgerOpProv.insertOne(newEntry, { session: currSession });
        }
      } else if (opts.operation === 'deposit') {
        return this.ledgerOpProv.insertOne(newEntry, { session: currSession });
      } 
      
      return this.ledgerOpProv.findOne({ query: { userId: newEntry.userId }, session: currSession });
    })();
    
    await currSession.commitTransaction();
    await currSession.endSession();

    return insertedDoc;
  }
}