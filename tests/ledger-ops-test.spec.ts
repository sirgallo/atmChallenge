import { MongoMemoryServer } from 'mongodb-memory-server';
import lodash from 'lodash';
const { first, last, reverse } = lodash;

import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { ILedgerEntry, LedgerOpType } from '@db/models/Ledger';
import { LedgerOpProvider } from '@db/providers/LedgerOpProvider';
import { dbConf } from '@db/DbConf';
import { connectOpts, MockDataProvider } from '@db/testUtils/LocalDbUtils';
import { sleep } from '@core/utils/Utils';
import { AuthProvider } from '@ledger/providers/AuthProvider';


let mongoServer: MongoMemoryServer;
let ledgerDb: LedgerMongooseProvider;
let ledgerOpProv: LedgerOpProvider;
let authProv: AuthProvider;


beforeEach(async () => {
  mongoServer = await MongoMemoryServer.create();
  const baseUri = mongoServer.getUri();
  ledgerDb = new LedgerMongooseProvider(dbConf.ledgerModels.name);

  await createDatabase(baseUri, dbConf.ledgerModels.name);
  const fullUri = `${baseUri}${dbConf.ledgerModels.name}`;
  await ledgerDb.initDefault({ connection: { fullUri }, overrideOpts: connectOpts });
  await initDataAndProviders();
});

afterEach(async () => {
  await ledgerDb.conn.close();
  await mongoServer.stop();
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
  
  authProv = new AuthProvider(ledgerDb);
  ledgerOpProv = new LedgerOpProvider(ledgerDb);

  for (const user of MockDataProvider.getMockUsers()) {
    await authProv.register(user);
  }
};


test('test deposit of round number into first user on insert', async () => {
  const firstMockTransaction = first(MockDataProvider.getMockTransactions());
  const transactionSize = 24500;
  const totalBalance = firstMockTransaction.totalBalance + transactionSize;
  
  const documentToInsert: ILedgerEntry = {
    userId: firstMockTransaction.userId,
    operation: 'deposit',
    transactionSize, totalBalance,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const inserted: ILedgerEntry = await ledgerOpProv.insertOne(documentToInsert);

  expect(inserted).toMatchObject(documentToInsert);
});

test('test deposit of decimal number into first user on insert', async () => {
  const firstMockTransaction = first(MockDataProvider.getMockTransactions());
  const transactionSize = 24500.25;
  const totalBalance = firstMockTransaction.totalBalance + transactionSize;
  
  const documentToInsert: ILedgerEntry = {
    userId: firstMockTransaction.userId,
    operation: 'deposit',
    transactionSize, totalBalance,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  const inserted = await ledgerOpProv.insertOne(documentToInsert);
  
  expect(inserted).toMatchObject(documentToInsert);
  expect(inserted.totalBalance).toEqual(documentToInsert.totalBalance);
  expect(inserted.transactionSize).toEqual(documentToInsert.transactionSize);
});

test('test withdrawal of round number from first user on insert', async () => {
  const firstMockTransaction = first(MockDataProvider.getMockTransactions());
  const transactionSize = 5;
  const totalBalance = firstMockTransaction.totalBalance - transactionSize;
  
  const documentToInsert: ILedgerEntry = {
    userId: firstMockTransaction.userId,
    operation: 'withdraw',
    transactionSize, totalBalance,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  const inserted = await ledgerOpProv.insertOne(documentToInsert);

  expect(inserted).toMatchObject(documentToInsert);
  expect(inserted.totalBalance).toEqual(documentToInsert.totalBalance);
  expect(inserted.transactionSize).toEqual(documentToInsert.transactionSize);
});

test('test withdrawal of decimal number from first user on insert', async () => {
  const firstMockTransaction = first(MockDataProvider.getMockTransactions());
  const transactionSize = 0.5;
  const totalBalance = firstMockTransaction.totalBalance - transactionSize;
  
  const documentToInsert: ILedgerEntry = {
    userId: firstMockTransaction.userId,
    operation: 'withdraw',
    transactionSize, totalBalance,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  const inserted = await ledgerOpProv.insertOne(documentToInsert);

  expect(inserted).toMatchObject(documentToInsert);
  expect(inserted.totalBalance).toEqual(documentToInsert.totalBalance);
  expect(inserted.transactionSize).toEqual(documentToInsert.transactionSize);
});

test('test finding one transaction based on userId', async () => {
  const firstMockTransaction = first(MockDataProvider.getMockTransactions());
  const doc = await ledgerOpProv.findOne({ query: { userId: firstMockTransaction.userId }});

  expect(doc).toMatchObject(firstMockTransaction);
});

test('test finding a transaction that doesnt exist', async () => {
  const doc = await ledgerOpProv.findOne({ query: { totalBalance: { $gt: 100000 }}});

  expect(doc).toBeNull();
});

test('test updating a single transaction', async () => {
  const firstMockTransaction = first(MockDataProvider.getMockTransactions());
  const doc = await ledgerOpProv.findOneAndUpdate({ 
    query: { 
      filter: { userId: firstMockTransaction.userId },
      update: { $set: { totalBalance: 30.5 }}
    }
  });

  expect(doc.totalBalance).toEqual(30.5);
});

test('test deleting a single transaction, then searching for it', async () => {
  const firstMockTransaction = first(MockDataProvider.getMockTransactions());
  await ledgerOpProv.deleteOne({ query: { userId: firstMockTransaction.userId }});
  const doc = await ledgerOpProv.findOne({ query: { userId: firstMockTransaction.userId }});

  expect(doc).toBeNull();
});

test('test inserting multiple transactions, then getting all transactions', async () => {
  const firstMockTransaction = first(MockDataProvider.getMockTransactions());
  const firstTransaction = await ledgerOpProv.findOne({ query: { userId: firstMockTransaction.userId }});
  
  const transactions: { transactionSize: number, operation: LedgerOpType }[]  = [ 
    { transactionSize: 1054, operation: 'deposit' }, 
    { transactionSize: 54.3, operation: 'withdraw' }, 
    { transactionSize: 105.6, operation: 'withdraw' } 
  ];
  const allTransactions: ILedgerEntry[] = [ firstTransaction ];

  for (const [ _, obj ] of Object.entries(transactions)) {
    const { transactionSize, operation } = obj;
    const totalBalance = (() => {
      const lastTotal = last(allTransactions).totalBalance;
      if (operation === 'deposit') return lastTotal + transactionSize;
      return lastTotal - transactionSize;
    })();

    const doc: ILedgerEntry = {
      userId: firstMockTransaction.userId,
      operation, transactionSize, totalBalance
    };

    const inserted = await ledgerOpProv.insertOne(doc);
    allTransactions.push(inserted);

    await sleep(10);
  }

  const resp = await ledgerOpProv.getTransactions({ userId: firstMockTransaction.userId, maxDays: 30 });
  const descendingTransactions = reverse(allTransactions);

  for (const [ idx, obj ] of Object.entries(descendingTransactions)) {
    const testEntry = resp[parseInt(idx)];
    
    expect(testEntry.createdAt.toISOString()).toEqual(obj.createdAt.toISOString());
    expect(testEntry.totalBalance).toEqual(obj.totalBalance);
    expect(testEntry.transactionSize).toEqual(obj.transactionSize);
  }
});