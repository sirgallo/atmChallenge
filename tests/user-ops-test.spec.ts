import { MongoMemoryServer } from 'mongodb-memory-server';
import lodash from 'lodash';
const { first } = lodash;

import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { dbConf } from '@db/DbConf';
import { connectOpts, MockDataProvider } from '@db/testUtils/LocalDbUtils';
import { AuthProvider } from '@ledger/providers/AuthProvider';
import { UserOpProvider } from '@db/providers/UserOpProvider';
import { IUser } from '@db/models/User';


let mongoServer: MongoMemoryServer;
let ledgerDb: LedgerMongooseProvider;
let userOpProv: UserOpProvider;
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
  
  userOpProv = new UserOpProvider(ledgerDb);
  authProv = new AuthProvider(ledgerDb);

  for (const user of MockDataProvider.getMockUsers()) {
    await authProv.register(user);
  }
};


test('find one mock user', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  const user: IUser = await userOpProv.findOne({ query: { userId: mockUser.userId }});

  expect(user).not.toBeNull();
  expect(user.email).toBe(mockUser.email);
});

test('insert one user', async () => {
  const newUser: IUser = {
    userId: 'testUser',
    email: 'test5@test.com',
    password: '1234',
    phone: '0000000006'
  };

  const inserted = await userOpProv.insertOne(newUser);

  expect(inserted).toMatchObject(newUser);
});

test('delete one user', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  await userOpProv.deleteOne({ query: { userId: mockUser.userId }});
  const userDoc = await userOpProv.findOne({ query: { userId: mockUser.userId }});

  expect(userDoc).toBeNull();
});

test('find one user and update the phone number', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  const updatedDoc = await userOpProv.findOneAndUpdate({
    query: {
      filter: { userId: mockUser.userId },
      update: { $set: { phone: '1234567890' }}
    }
  });

  expect(updatedDoc.phone).not.toBe(mockUser.phone);
});