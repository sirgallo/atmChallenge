import { MongoMemoryServer } from 'mongodb-memory-server';
import lodash from 'lodash';
const { first } = lodash;

import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { dbConf } from '@db/DbConf';
import { connectOpts, MockDataProvider } from '@db/testUtils/LocalDbUtils';
import { AuthProvider } from '@ledger/providers/AuthProvider';
import { RegisterUserRequest } from '@ledger/models/AuthRequest';
import { TokenOpProvider } from '@db/providers/TokenOpProvider';
import { UserOpProvider } from '@db/providers/UserOpProvider';
import { IUser } from '@db/models/User';
import { EncryptProvider } from '@core/auth/providers/EncryptProvider';


let mongoServer: MongoMemoryServer;
let ledgerDb: LedgerMongooseProvider;
let authProv: AuthProvider;
let tokenOpProv: TokenOpProvider;
let userOpProv: UserOpProvider;


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
  tokenOpProv = new TokenOpProvider(ledgerDb);
  userOpProv = new UserOpProvider(ledgerDb);

  for (const user of MockDataProvider.getMockUsers()) {
    await authProv.register(user);
  }
}; 


test('register a new user', async () => {
  const newUser: RegisterUserRequest = {
    userId: 'testId',
    password: '1234',
    email: 'test9@test.com',
    phone: '0000000009'
  };

  const jwt = await authProv.register(newUser);
  const userDoc = await userOpProv.findOne({ query: { userId: newUser.userId }});
  const tokenDoc = await tokenOpProv.findOne({ query: { token: jwt, userId: userDoc.userId }});

  expect(userDoc).not.toBeNull();
  expect(tokenDoc).not.toBeNull();
});

test('authenticate an existing user', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  const jwt = await authProv.authenticate({ email: mockUser.email, password: mockUser.password });

  const userDoc = await userOpProv.findOne({ query: { userId: mockUser.userId }});
  const tokenDoc = await tokenOpProv.findOne({ query: { token: jwt, userId: userDoc.userId }}); 
  
  expect(tokenDoc).not.toBeNull();
});

test('handle passwords not matching on auth', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  try {
    await authProv.authenticate({ email: mockUser.email, password: '1234' });
  } catch (err) {
    expect(err.message).toBe('Passwords do not match.');
  }
});

test('test token check method if not exists', async () => {
  const newUser: IUser = {
    userId: 'testId',
    password: '1234',
    email: 'test9@test.com',
    phone: '0000000009'
  };

  newUser.password = await new EncryptProvider().encrypt(newUser.password);

  await userOpProv.insertOne(newUser);
  const isValid = await authProv.checkToken(newUser.userId, 'randomtest');

  expect(isValid).toBe(false);
});

test('test token check if token is incorrect', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  await authProv.authenticate({ email: mockUser.email, password: mockUser.password });
  const isValid = await authProv.checkToken(mockUser.userId, 'randomtest');

  expect(isValid).toBe(false);
});

test('test token match', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  const jwt = await authProv.authenticate({ email: mockUser.email, password: mockUser.password });
  const isValid = await authProv.checkToken(mockUser.userId, jwt);

  expect(isValid).toBe(true);
});