import { MongoMemoryServer } from 'mongodb-memory-server';

import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { dbConf } from '@db/DbConf';
import { connectOpts, MockDataProvider } from '@db/testUtils/LocalDbUtils';
import { SystemProvider } from '@ledger/providers/SystemProvider';
import { SystemOpProvider } from '@db/providers/SystemOpProvider';
import { AuthProvider } from '@ledger/providers/AuthProvider';


let mongoServer: MongoMemoryServer;
let ledgerDb: LedgerMongooseProvider;
let sysOpProv: SystemOpProvider;
let sysProv: SystemProvider;
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
  
  sysProv = new SystemProvider(ledgerDb, MockDataProvider.getMockSystem().sysId);
  sysOpProv = new SystemOpProvider(ledgerDb);
  authProv = new AuthProvider(ledgerDb);

  for (const user of MockDataProvider.getMockUsers()) {
    await authProv.register(user);
  }
};


test('get original balance from seed', async () => {
  const { balance } = await sysProv.getBalance();
  expect(balance).toEqual(10000);
});

test('update funds and withdraw money', async () => {
  await sysProv.updateFunds({ operation: 'subtract', transactionSize: 4000.5 });
  const updatedDoc = await sysOpProv.findOne({ query: { sysId: MockDataProvider.getMockSystem().sysId }});

  expect(updatedDoc.balance).toEqual(5999.5);
});

test('update funds and try to withdraw more than is in the atm', async () => {
  await sysProv.updateFunds({ operation: 'subtract', transactionSize: 12000 });
  const updatedDoc = await sysOpProv.findOne({ query: { sysId: MockDataProvider.getMockSystem().sysId }});

  expect(updatedDoc.balance).toEqual(10000);
});

test('update funds and add money to the atm', async () => {
  await sysProv.updateFunds({ operation: 'add', transactionSize: 2000 });
  const updatedDoc = await sysOpProv.findOne({ query: { sysId: MockDataProvider.getMockSystem().sysId }});

  expect(updatedDoc.balance).toEqual(12000);
});