import { Model } from 'mongoose';

import { MongooseProvider } from '@core/providers/dataAccess/MongooseProvider';
import { dbConf } from '@db/DbConf';
import { LedgerEntryDocument, LedgerSchema } from '@db/models/Ledger';
import { SystemDocument, SystemSchema } from '@db/models/System';
import { TokenDocument, UserDocument, UserSchema, TokenSchema } from '@db/models/User';


export class LedgerMongooseProvider extends MongooseProvider {
  mLedger: Model<LedgerEntryDocument>;
  mSystem: Model<SystemDocument>;
  mToken: Model<TokenDocument>;
  mUser: Model<UserDocument>;
  
  initModels() {
    this.mLedger = this.conn.model<LedgerEntryDocument>(dbConf.ledgerModels.collections.Ledger, LedgerSchema);
    this.mSystem = this.conn.model<SystemDocument>(dbConf.ledgerModels.collections.System, SystemSchema);
    this.mToken = this.conn.model<TokenDocument>(dbConf.ledgerModels.collections.Token, TokenSchema);
    this.mUser = this.conn.model<UserDocument>(dbConf.ledgerModels.collections.User, UserSchema);
  }
}