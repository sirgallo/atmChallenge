import { Schema, Document } from 'mongoose' 


//======================== collection names


export const UserCollectionName = 'user';
export const TokenCollectionName = 'token';


//======================== db models


export interface IUser {
  userId: string;
  email: string;
  phone: string;
  password: string;

  // injected
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IToken {
  userId: string;
  token: string;
  refreshToken: string;
  issueDate: Date;
  refreshIssueDate: Date;
  expiresIn: number;
  refreshExpiresIn: number;

  // injected
  createdAt?: Date;
  updatedAt?: Date;
}


//======================== mongo specific schemas


//  need to extend mongo document for schema to include all mongo document fields
export interface UserDocument extends IUser, Document {}
export interface TokenDocument extends IToken, Document {}

export const UserSchema: Schema<UserDocument> = new Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true},
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true, unique: false }
}, { 
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, 
  collection: UserCollectionName,
  minimize: false
});

export const TokenSchema: Schema<TokenDocument> = new Schema({
  userId: { type: String, index: true, required: true, unique: true},
  token: { type: String, required: true, unique: false },
  refreshToken: { type: String, required: true, unique: false },
  issueDate: { type: Date, index: true, required: true, unique: false },
  refreshIssueDate: { type: Date, index: true, required: true, unique: false },
  expiresIn: { type: Number, index: false, required: true, unique: false },
  refreshExpiresIn: { type: Number, index: false, required: true, unique: false }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: TokenCollectionName,  
  minimize: false
});


//======================== indexes


UserSchema.index({ email: 1 });
TokenSchema.index({ userId: 1 });