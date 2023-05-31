import { Schema, Document } from 'mongoose' 


//======================== collection names


export const LedgerCollectionName = 'ledger';


//======================== db models


export type LedgerOpType = 'deposit' | 'withdraw';
export interface ILedgerEntry {
  userId: string;
  operation: LedgerOpType;
  transactionSize: number;
  totalBalance: number;

  // injected
  createdAt?: Date;
  updatedAt?: Date;
}


//======================== mongo specific schemas


//  need to extend mongo document for schema to include all mongo document fields
export interface LedgerEntryDocument extends ILedgerEntry, Document {}

export const LedgerSchema: Schema<LedgerEntryDocument> = new Schema({
  userId: { type: String, required: false, unique: false },
  operation: { type: String, required: false, unique: false },
  transactionSize: { type: Number, required: false, unique: false },
  totalBalance: { type: Number, required: false, unique: false }
}, { 
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, 
  collection: LedgerCollectionName,
  minimize: false
});


//======================== indexes


/*
  Index on User Id and descending on createdAt, this allows for sub linear lookup

  Structure

  ...       uid1            uid2            uid3        ...
  ...        |               |               |          ...
        t3, t2, t1...   t3, t2, t1...   t3, t2, t1...  

*/
LedgerSchema.index({ userId: 1, createdAt: -1 });