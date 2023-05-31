import { Schema, Document } from 'mongoose'; 


//======================== collection names


export const SystemsCollectionsName = 'system';


//======================== db models


export interface ISystem {
  sysId: string;
  balance: number;

  // injected
  createdAt?: Date;
  updatedAt?: Date;
}

interface JWTProps {
  jwtSecret: string;
  refreshSecret: string;
  timeSpan: number;
  refreshTimeSpan: number;
}

// TODO
export interface ISystemProperties {
  sysId: string;
  jwt: JWTProps;
}


//======================== mongo specific schemas


//  need to extend mongo document for schema to include all mongo document fields
export interface SystemDocument extends ISystem, Document {}

export const SystemSchema: Schema<SystemDocument> = new Schema({
  sysId: { type: String, required: true, unique: true },
  balance: { type: Number, required: true, unique: false }
}, { 
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, 
  collection: SystemsCollectionsName,
  minimize: false
});