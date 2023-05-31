import { 
  ClientSession, FilterQuery, UpdateQuery, 
  InsertManyOptions, QueryOptions
} from 'mongoose';
import { subDays } from 'date-fns';
import lodash from 'lodash';
const { first, merge } = lodash;

import { BaseMongooseOpProvider } from '@core/providers/dataAccess/BaseMongooseOpProvider';
import { applySession } from '@core/providers/dataAccess/MongooseProvider';
import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { ILedgerEntry } from '@db/models/Ledger';


export class LedgerOpProvider extends BaseMongooseOpProvider<ILedgerEntry> {
  constructor(private ledgerDb: LedgerMongooseProvider) {
    super();
  }

  async findOne(opts: { query: FilterQuery<ILedgerEntry>, session?: ClientSession }): Promise<ILedgerEntry> {
    return this.ledgerDb.mLedger.findOne(opts.query, null, applySession(opts?.session));
  }

  async insertOne(newEntry: ILedgerEntry, opts?: { session: ClientSession }): Promise<ILedgerEntry> {
    const insertOptions: InsertManyOptions = { rawResult: false, lean: true };
    if (opts?.session) merge(insertOptions, applySession(opts.session));

    return first(await this.ledgerDb.mLedger.insertMany([ newEntry ], insertOptions))
  }

  // not used, transactions should be immutable
  async deleteOne(opts: { query: FilterQuery<ILedgerEntry>, session?: ClientSession }): Promise<boolean> {
    await this.ledgerDb.mLedger.deleteOne(opts.query, applySession(opts?.session));
    return true;
  }

  // not used, transactions should be immutable  
  async findOneAndUpdate(opts: { query: { filter: FilterQuery<ILedgerEntry>, update: UpdateQuery<ILedgerEntry> }, session?: ClientSession }): Promise<ILedgerEntry> {
    const queryOptions: QueryOptions = { new: true };
    if (opts?.session) merge(queryOptions, applySession(opts.session));

    return this.ledgerDb.mLedger.findOneAndUpdate(opts.query.filter, opts.query.update, queryOptions);
  }

  async getTransactions(opts: { userId: string, maxDays: number }): Promise<ILedgerEntry[]> {
    const lookup = LookupPipelineGenerator.genTransactionLookup(opts.userId, subDays(new Date(), opts.maxDays));
    return this.ledgerDb.mLedger.aggregate(lookup);
  }
}

class LookupPipelineGenerator {
  static genTransactionLookup = (userId: string, $gte?: Date, limit?: number): any[] => {
    const $match = $gte ? { userId, createdAt: { $gte }} : { userId };

    const transactionLookupPipeline = [];
    transactionLookupPipeline.push(
      { $match }, 
      {
        $project: {
          userId: 1, operation: 1, transactionSize: 1, 
          totalBalance: 1, createdAt: 1, _id: 0
        }
      }
    );
    if (limit) transactionLookupPipeline.push({ $limit: limit })

    return transactionLookupPipeline;
  }
}