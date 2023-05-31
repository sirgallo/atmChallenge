import { MongoMemoryReplSet } from 'mongodb-memory-server';
import lodash from 'lodash';
const { first, reverse } = lodash;

import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { ILedgerEntry, LedgerOpType } from '@db/models/Ledger';
import { LedgerOpProvider } from '@db/providers/LedgerOpProvider';
import { dbConf } from '@db/DbConf';
import { connectOpts, MockDataProvider } from '@db/testUtils/LocalDbUtils';
import { SystemProvider } from '@ledger/providers/SystemProvider';
import { LedgerProvider } from '@ledger/providers/LedgerProvider';
import { CreateTransactionRequest } from '@ledger/models/LedgerRequest';
import { sleep } from '@core/utils/Utils';
import { AuthProvider } from '@ledger/providers/AuthProvider';


let replicaSet: MongoMemoryReplSet;
let ledgerDb: LedgerMongooseProvider;
let ledgerOpProv: LedgerOpProvider;
let ledgerProv: LedgerProvider;
let sysProv: SystemProvider;
let authProv: AuthProvider;
 

beforeEach(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { storageEngine: 'wiredTiger' }});
  const baseUri = replicaSet.getUri();
  ledgerDb = new LedgerMongooseProvider(dbConf.ledgerModels.name);

  await createDatabase(baseUri, dbConf.ledgerModels.name);
  const fullUri = (() => {
    const splitUri = baseUri.split('?');
    return `${splitUri[0]}${dbConf.ledgerModels.name}${splitUri[1]}`;
  })();
  
  await ledgerDb.initDefault({ connection: { fullUri }, overrideOpts: connectOpts });
  await initDataAndProviders();
});

afterEach(async () => {
  await ledgerDb.conn.close();
  await replicaSet.stop();
});


const createDatabase = async (fullUri: string, name: string) => {
  const connection = await ledgerDb.createNewConnection({ connection: { fullUri }, overrideOpts: connectOpts });
  await connection.db.command({ create: name });

  await connection.close();
};

const initDataAndProviders = async () =>{
  // Insert the seed data into the collection
  await ledgerDb.mSystem.insertMany([ MockDataProvider.getMockSystem() ]);
  await ledgerDb.mLedger.insertMany(MockDataProvider.getMockTransactions());
  
  ledgerOpProv = new LedgerOpProvider(ledgerDb);
  sysProv = new SystemProvider(ledgerDb, MockDataProvider.getMockSystem().sysId);
  ledgerProv = new LedgerProvider(ledgerDb, sysProv);
  authProv = new AuthProvider(ledgerDb);

  for (const user of MockDataProvider.getMockUsers()) {
    await authProv.register(user);
  }
};


test('get balance from mock user on seed data', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  const transaction = await ledgerOpProv.findOne({ query: { userId: mockUser.userId }});
  const { totalBalance } = await ledgerProv.getBalance({ userId: mockUser.userId });

  expect(totalBalance).toBe(transaction.totalBalance);
});

test('withdraw money from mock user', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  const transaction = await ledgerOpProv.findOne({ query: { userId: mockUser.userId }});
  
  const req: CreateTransactionRequest = {
    userId: mockUser.userId, 
    operation: 'withdraw',
    transactionSize: 5
  };

  const newTransaction = await ledgerProv.createTransaction(req);
  const { totalBalance } = await ledgerProv.getBalance({ userId: mockUser.userId });

  expect(newTransaction.totalBalance).toBe(transaction.totalBalance - 5);
  expect(totalBalance).toBe(transaction.totalBalance - 5);
});

test('overdraft mock user', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  const transaction = await ledgerOpProv.findOne({ query: { userId: mockUser.userId }});
  
  const req: CreateTransactionRequest = {
    userId: mockUser.userId, 
    operation: 'withdraw',
    transactionSize: 11.5
  };

  const newTransaction = await ledgerProv.createTransaction(req);
  const { totalBalance } = await ledgerProv.getBalance({ userId: mockUser.userId });

  const overdrawBalance = transaction.totalBalance - req.transactionSize - 5;
  expect(newTransaction.totalBalance).toBe(overdrawBalance);
  expect(totalBalance).toBe(overdrawBalance);
});

test('attempt withdraw where transaction is larger than total balance in atm', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());

  const depositReq: CreateTransactionRequest = {
    userId: mockUser.userId, 
    operation: 'deposit',
    transactionSize: 10500
  };
  await ledgerProv.createTransaction(depositReq);
  const { totalBalance } = await ledgerProv.getBalance({ userId: mockUser.userId });

  const withdrawReq: CreateTransactionRequest = {
    userId: mockUser.userId,
    operation: 'withdraw',
    transactionSize: 10500
  };
  const newTransaction = await ledgerProv.createTransaction(withdrawReq);

  expect(newTransaction.totalBalance).toBe(totalBalance);
});

test('test inserting multiple transactions, then getting all transactions', async () => {
  const firstMockTransaction = first(MockDataProvider.getMockTransactions());
  const firstTransaction = await ledgerOpProv.findOne({ query: { userId: firstMockTransaction.userId }});
  
  const newTransactions: { transactionSize: number, operation: LedgerOpType }[]  = [ 
    { transactionSize: 1054, operation: 'deposit' }, 
    { transactionSize: 54.3, operation: 'withdraw' }, 
    { transactionSize: 105.6, operation: 'withdraw' } 
  ];
  const allTransactions: ILedgerEntry[] = [ firstTransaction ];

  for (const [ _, obj ] of Object.entries(newTransactions)) {
    const { transactionSize, operation } = obj;
    const doc: CreateTransactionRequest = {
      userId: firstMockTransaction.userId,
      operation, transactionSize
    };

    const inserted = await ledgerProv.createTransaction(doc);
    allTransactions.push(inserted);

    await sleep(10);
  }

  const { transactions } = await ledgerProv.getTransactions({ userId: firstMockTransaction.userId });
  const descendingTransactions = reverse(allTransactions);

  for (const [ idx, obj ] of Object.entries(descendingTransactions)) {
    const testEntry = transactions[parseInt(idx)];
    
    expect(testEntry.createdAt.toISOString()).toEqual(obj.createdAt.toISOString());
    expect(testEntry.totalBalance).toEqual(obj.totalBalance);
    expect(testEntry.transactionSize).toEqual(obj.transactionSize);
  }
});