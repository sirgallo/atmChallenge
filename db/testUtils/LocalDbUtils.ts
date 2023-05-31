import { ConnectOptions } from 'mongoose';

import { IUser } from '@db/models/User';
import { ISystem } from '@db/models/System';
import { ILedgerEntry } from '@db/models/Ledger';


export const connectOpts: ConnectOptions = {
  maxPoolSize: 10
};

export class MockDataProvider {
  static getMockUsers = (): IUser[] => {
    return [
      {
        userId: '2859459814',
        password: '7386',
        email: 'test1@test.com',
        phone: '0000000000'
      },
      {
        userId: '1434597300',
        password: '4557',
        email: 'test2@test.com',
        phone: '0000000001'
      },
      {
        userId: '7089382418',
        password: '0075',
        email: 'test3@test.com',
        phone: '0000000002'
      },
      {
        userId: '2001377812',
        password: '5950',
        email: 'test4@test.com',
        phone: '0000000003'
      }
    ];
  }

  static getMockSystem = (): ISystem => {
    return {
      sysId: '7f97220a-568a-4f0c-a5dd-960be26b4b42',
      balance: 10000
    };
  }

  static getMockTransactions = (): ILedgerEntry[] => {
    return [
      {
        userId: '2859459814',
        operation: 'deposit',
        transactionSize: 10.24,
        totalBalance: 10.24
      },
      {
        userId: '1434597300',
        operation: 'deposit',
        transactionSize: 90000.55,
        totalBalance: 90000.55
      },
      { 
        userId: '7089382418',
        operation: 'deposit',
        transactionSize: 0,
        totalBalance: 0
      },
      {
        userId: '2001377812',
        operation: 'deposit',
        transactionSize: 60,
        totalBalance: 60
      }
    ];
  }
}