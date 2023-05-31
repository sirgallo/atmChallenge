import { MongoMemoryServer } from 'mongodb-memory-server';
import lodash from 'lodash';
const { first, isEqual, isEmpty, isNull } = lodash;

import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { dbConf } from '@db/DbConf';
import { connectOpts, MockDataProvider } from '@db/testUtils/LocalDbUtils';
import { TokenOpProvider } from '@db/providers/TokenOpProvider';
import { AuthProvider } from '@ledger/providers/AuthProvider';
import { IToken } from '@db/models/User';
import { TIMESPAN, REFRESHTIMESPAN } from '@core/auth/providers/JwtProvider';


let mongoServer: MongoMemoryServer;
let ledgerDb: LedgerMongooseProvider;
let tokenOpProv: TokenOpProvider;
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
  
  tokenOpProv = new TokenOpProvider(ledgerDb);
  authProv = new AuthProvider(ledgerDb);

  for (const user of MockDataProvider.getMockUsers()) {
    await authProv.register(user);
  }
};


test('find one token generated from mock user registration', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  const token = await tokenOpProv.findOne({ query: { userId: mockUser.userId }});

  expect(token).not.toBeNull();
});

test('attempt insert one token for user where token already exists', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  const newAccessToken: IToken = {
    userId: mockUser.userId,
    token: 'randomJWTString!',
    refreshToken: 'randomRefreshString!',
    issueDate: new Date(),
    refreshIssueDate: new Date(),
    expiresIn: TIMESPAN,
    refreshExpiresIn: REFRESHTIMESPAN
  };

  try {
    await tokenOpProv.insertOne(newAccessToken);
  } catch (err) {
    expect((err as Error).message.includes('duplicate key error collection')).toBe(true);
  }
});

test('delete one token entry', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  await tokenOpProv.deleteOne({ query: { userId: mockUser.userId }});
  const token = await tokenOpProv.findOne({ query: { userId: mockUser.userId }});
  
  expect(token).toBeNull();
});

test('update issue date on an existing token for mock user', async () => {
  const mockUser = first(MockDataProvider.getMockUsers());
  const existingToken = await tokenOpProv.findOne({ query: { userId: mockUser.userId }});

  const updatedToken = await tokenOpProv.findOneAndUpdate({
    query: {
      filter: { userId: mockUser.userId },
      update: { $set: { issueDate: new Date() }}
    }
  });

  expect(updatedToken.issueDate.toISOString()).not.toBe(existingToken.issueDate.toISOString());
});