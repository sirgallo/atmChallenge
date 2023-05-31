
import { 
  ClientSession, FilterQuery, UpdateQuery, 
  InsertManyOptions, QueryOptions
} from 'mongoose';
import lodash from 'lodash';
const { first, merge } = lodash;

import { BaseMongooseOpProvider } from '@core/providers/dataAccess/BaseMongooseOpProvider';
import { applySession } from '@core/providers/dataAccess/MongooseProvider';
import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { IUser } from '@db/models/User';


export class UserOpProvider extends BaseMongooseOpProvider<IUser> {
  constructor(private ledgerDb: LedgerMongooseProvider) {
    super();
  }

  async findOne(opts: { query: FilterQuery<IUser>, session?: ClientSession }): Promise<IUser> {
    return this.ledgerDb.mUser.findOne(opts.query, null, applySession(opts?.session));
  }

  async insertOne(newEntry: IUser, opts?: { session: ClientSession }): Promise<IUser> {
    const insertOptions: InsertManyOptions = { rawResult: false, lean: true };
    if (opts?.session) merge(insertOptions, applySession(opts.session));

    return first(await this.ledgerDb.mUser.insertMany([ newEntry ], insertOptions));
  }

  async deleteOne(opts: { query: FilterQuery<IUser>, session?: ClientSession }): Promise<boolean> {
    await this.ledgerDb.mUser.deleteOne(opts.query, applySession(opts?.session));
    return true;
  }

  async findOneAndUpdate(opts: { query: { filter: FilterQuery<IUser>, update: UpdateQuery<IUser> }, session?: ClientSession }): Promise<IUser> {
    const queryOptions: QueryOptions = { new: true };
    if (opts?.session) merge(queryOptions, applySession(opts.session));

    return this.ledgerDb.mUser.findOneAndUpdate(opts.query.filter, opts.query.update, queryOptions);
  }
}