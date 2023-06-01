import { MongoMemoryServer } from 'mongodb-memory-server';

import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { dbConf } from '@db/DbConf';
import { connectOpts } from '@db/testUtils/LocalDbUtils';
import { TokenOpProvider } from '@db/providers/TokenOpProvider';
import { IToken } from '@db/models/User';
import { JwtProvider } from '@core/auth/providers/JwtProvider';
import { jwtSecret } from '@core/auth/configs/Secret';
import { toMs, sleep } from '@core/utils/Utils';


let mongoServer: MongoMemoryServer;
let ledgerDb: LedgerMongooseProvider;
let tokenOpProv: TokenOpProvider;
let jwtProv: JwtProvider;
const dummyUserId = 'dummyUserId';


beforeAll(() => {
  jwtProv = new JwtProvider();
});

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
  tokenOpProv = new TokenOpProvider(ledgerDb);
};


test('confirm that jwt is verified', async () => {
  const jwt = await jwtProv.sign(dummyUserId, jwtSecret, toMs.sec(10));
  const isValid = await jwtProv.verified(jwt, jwtSecret);

  expect(isValid.verified).toBe(true);
}, toMs.sec(30));

test('confirm that random val is not verified', async () => {
  try {
    const jwt = await jwtProv.sign(dummyUserId, jwtSecret, toMs.sec(10));
    await sleep(toMs.sec(12));
    const isValid = await jwtProv.verified('randomVal', jwtSecret);
  } catch (err) {
    expect((err as Error).message).toBe('jwt malformed');
  }
}, toMs.sec(30));

test('token is within expiration', async () => {
  const jwt = await jwtProv.sign(dummyUserId, jwtSecret, toMs.sec(10));
  const newAccessToken: IToken = {
    userId: dummyUserId,
    token: jwt,
    refreshToken: null,
    issueDate: new Date(),
    refreshIssueDate: new Date(),
    expiresIn: toMs.sec(10),
    refreshExpiresIn: null
  };

  await tokenOpProv.insertOne(newAccessToken);
  await sleep(toMs.sec(5));

  const token = await tokenOpProv.findOne({ query: { userId: dummyUserId }});
  const isValid = await jwtProv.verified(token.token, jwtSecret);
  const isWithinExp = jwtProv.withinExpiration(token.issueDate, token.expiresIn);

  expect(isValid.verified).toBe(true);
  expect(isWithinExp).toBe(true);
}, toMs.sec(30));

test('token is outside of expiration', async () => {
  const jwt = await jwtProv.sign(dummyUserId, jwtSecret, toMs.sec(10));
  const newAccessToken: IToken = {
    userId: dummyUserId,
    token: jwt,
    refreshToken: null,
    issueDate: new Date(),
    refreshIssueDate: new Date(),
    expiresIn: toMs.sec(10),
    refreshExpiresIn: null
  };

  await tokenOpProv.insertOne(newAccessToken);
  await sleep(toMs.sec(12));

  const token = await tokenOpProv.findOne({ query: { userId: dummyUserId }});
  const isValid = await jwtProv.verified(token.token, jwtSecret);
  const isWithinExp = jwtProv.withinExpiration(token.issueDate, token.expiresIn);

  expect(isValid.verified).toBe(true);
  expect(isWithinExp).toBe(false);
}, toMs.sec(30));