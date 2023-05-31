import { MongoMemoryServer } from 'mongodb-memory-server';

import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { dbConf } from '@db/DbConf';
import { connectOpts, MockDataProvider } from '@db/testUtils/LocalDbUtils';
import { SystemOpProvider } from '@db/providers/SystemOpProvider';
import { AuthProvider } from '@ledger/providers/AuthProvider';
import { ISystem } from '@db/models/System';


let mongoServer: MongoMemoryServer;
let ledgerDb: LedgerMongooseProvider;
let sysOpProv: SystemOpProvider;
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
  
  sysOpProv = new SystemOpProvider(ledgerDb);
  authProv = new AuthProvider(ledgerDb);

  for (const user of MockDataProvider.getMockUsers()) {
    await authProv.register(user);
  }
};


test('find existing mock system', async () => {
  const mockSys = MockDataProvider.getMockSystem();
  const sysDoc = await sysOpProv.findOne({ query: { sysId: mockSys.sysId }});

  expect(sysDoc).toMatchObject(mockSys);
});

test('insert a new system with seed balance', async () => {
  const newSystem: ISystem = {
    sysId: 'randomSysId',
    balance: 10000
  };
  const newSysDoc: ISystem = await sysOpProv.insertOne(newSystem);

  expect(newSystem.sysId).toBe(newSysDoc.sysId);
  expect(newSystem.balance).toBe(newSysDoc.balance);
});

test('delete an existing system, in this case the mock system', async () => {
  const mockSys = MockDataProvider.getMockSystem();
  await sysOpProv.deleteOne({ query: { sysId: mockSys.sysId }});
  const sysDoc = await sysOpProv.findOne({ query: { sysId: mockSys.sysId }});

  expect(sysDoc).toBeNull();
});

test('update an existing system entry by changing the current balance', async () => {
  const mockSys = MockDataProvider.getMockSystem();
  const sysDoc = await sysOpProv.findOne({ query: { sysId: mockSys.sysId }});
  const updatedSys = await sysOpProv.findOneAndUpdate({
    query: {
      filter: { sysId: mockSys.sysId },
      update: { $set: { balance: 15000 }}
    }
  });

  expect(updatedSys.balance).not.toBe(sysDoc.balance);
});