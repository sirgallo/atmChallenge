import { 
  ClientSession, FilterQuery, UpdateQuery, 
  InsertManyOptions, QueryOptions
} from 'mongoose';
import lodash from 'lodash';
const { first, merge } = lodash;

import { BaseMongooseOpProvider } from '@core/providers/dataAccess/BaseMongooseOpProvider';
import { applySession } from '@core/providers/dataAccess/MongooseProvider';
import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { ISystem } from '@db/models/System';


export class SystemOpProvider extends BaseMongooseOpProvider<ISystem> {
  constructor(private ledgerDb: LedgerMongooseProvider) {
    super();
  }

  async findOne(opts: { query: FilterQuery<ISystem>, session?: ClientSession }): Promise<ISystem> {
    return this.ledgerDb.mSystem.findOne(opts.query, null, applySession(opts?.session));
  }

  async insertOne(newEntry: ISystem, opts?: { session: ClientSession }): Promise<ISystem> {
    const insertOptions: InsertManyOptions = { rawResult: false, lean: true };
    if (opts?.session) merge(insertOptions, applySession(opts.session));

    return first(await this.ledgerDb.mSystem.insertMany([ newEntry ], insertOptions));
  }

  async deleteOne(opts: { query: FilterQuery<ISystem>, session?: ClientSession }): Promise<boolean> {
    await this.ledgerDb.mSystem.deleteOne(opts.query, applySession(opts?.session));
    return true;
  }

  async findOneAndUpdate(opts: { query: { filter: FilterQuery<ISystem>, update: UpdateQuery<ISystem> }, session?: ClientSession }): Promise<ISystem> {
    const queryOptions: QueryOptions = { new: true };
    if (opts?.session) merge(queryOptions, applySession(opts.session));

    return this.ledgerDb.mSystem.findOneAndUpdate(opts.query.filter, opts.query.update, queryOptions);
  }
}