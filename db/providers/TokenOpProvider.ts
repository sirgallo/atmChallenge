import { 
  ClientSession, FilterQuery, UpdateQuery, 
  InsertManyOptions, QueryOptions
} from 'mongoose';
import lodash from 'lodash';
const { first, merge } = lodash;

import { BaseMongooseOpProvider } from '@core/providers/dataAccess/BaseMongooseOpProvider';
import { applySession } from '@core/providers/dataAccess/MongooseProvider';
import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { IToken } from '@db/models/User';


export class TokenOpProvider extends BaseMongooseOpProvider<IToken> {
  constructor(private ledgerDb: LedgerMongooseProvider) {
    super();
  }

  async findOne(opts: { query: FilterQuery<IToken>, session?: ClientSession }): Promise<IToken> {
    return this.ledgerDb.mToken.findOne(opts.query);
  }

  async insertOne(newEntry: IToken, opts?: { session: ClientSession }): Promise<IToken> {
    const insertOptions: InsertManyOptions = { rawResult: false, lean: true };
    if (opts?.session) merge(insertOptions, applySession(opts.session));

    return first(await this.ledgerDb.mToken.insertMany([ newEntry ], insertOptions));
  }

  async deleteOne(opts: { query: FilterQuery<IToken>, session?: ClientSession }): Promise<boolean> {
    await this.ledgerDb.mToken.deleteOne(opts.query, applySession(opts?.session));
    return true;
  }

  async findOneAndUpdate(opts: { query: { filter: FilterQuery<IToken>, update: UpdateQuery<IToken> }, session?: ClientSession }): Promise<IToken> {
    const queryOptions: QueryOptions = { new: true };
    if (opts?.session) merge(queryOptions, applySession(opts.session));

    return this.ledgerDb.mToken.findOneAndUpdate(opts.query.filter, opts.query.update, queryOptions);
  }
}