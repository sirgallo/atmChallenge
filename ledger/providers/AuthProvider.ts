import lodash from 'lodash';
const { first, some, every } = lodash;

import { JwtProvider } from '@core/auth/providers/JwtProvider';
import { EncryptProvider } from '@core/auth/providers/EncryptProvider';
import { LogProvider } from '@core/providers/LogProvider';
import { jwtSecret, refreshSecret } from '@core/auth/configs/Secret';
import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { IToken, IUser } from '@db/models/User';
import { AuthEndpoints } from '@ledger/models/Endpoints';
import { AuthenticateUserRequest, RegisterUserRequest } from '@ledger/models/AuthRequest';
import { TokenOpProvider } from '@db/providers/TokenOpProvider';
import { UserOpProvider } from '@db/providers/UserOpProvider';
import { toMs } from '@core/utils/Utils';


const NAME = 'Auth Provider'

export class AuthProvider implements AuthEndpoints {
  name = NAME;

  private zLog: LogProvider = new LogProvider(NAME);
  private crypt: EncryptProvider = new EncryptProvider();
  private jwt: JwtProvider = new JwtProvider(jwtSecret);
  private tokenOpProv: TokenOpProvider;
  private userOpProv: UserOpProvider;

  constructor(private ledgerDb: LedgerMongooseProvider) {
    this.tokenOpProv = new TokenOpProvider(this.ledgerDb);
    this.userOpProv = new UserOpProvider(this.ledgerDb);
  }

  async authenticate(opts: AuthenticateUserRequest): Promise<string> {
    try {
      const currUserEntry: IUser = await this.userOpProv.findOne({ query: { email: opts.email }});
      this.zLog.info(`Got User with Id: ${currUserEntry.userId}`);
      const passwordsMatch = await this.crypt.compare(opts.password, currUserEntry.password);

      if (passwordsMatch) {
        const jwToken = await this.jwt.sign(currUserEntry.userId, jwtSecret, toMs.min(2));
        const refreshToken = await this.jwt.sign(currUserEntry.userId, refreshSecret, toMs.min(2));
        const tokenEntry: IToken = await this.tokenOpProv.findOne({ query: { userId: currUserEntry.userId }});
    
        if (! tokenEntry) {
          const newAccessToken: IToken = {
            userId: currUserEntry.userId,
            token: jwToken,
            refreshToken: refreshToken,
            issueDate: new Date(),
            refreshIssueDate: new Date(),
            expiresIn: toMs.min(2),
            refreshExpiresIn: toMs.min(2)
          };
          const resp = await this.tokenOpProv.insertOne(newAccessToken);
          this.zLog.success(`New Token added with User Id: ${resp.userId}`);

          return jwToken;
        } else if (tokenEntry) {
          const jwtEntry = await this.jwt.verified(tokenEntry.token);
          const refreshEntry = await this.jwt.verified(tokenEntry.refreshToken, refreshSecret);
          
          const isWithinExpiration = this.jwt.withinExpiration(tokenEntry.issueDate, tokenEntry.expiresIn);
          this.zLog.info(`JWT within expiration: ${isWithinExpiration}`);

          if (every([ jwtEntry.verified, isWithinExpiration ])) {
            this.zLog.info('JWT already exists that is valid');

            const refreshWithinExpiration = this.jwt.withinExpiration(tokenEntry.refreshIssueDate, tokenEntry.refreshExpiresIn);
            if (some([ !refreshEntry.verified, !refreshWithinExpiration ])) {
              await this.tokenOpProv.findOneAndUpdate({
                query: {
                  filter: { userId: currUserEntry.userId }, 
                  update: { $set: { refreshToken: refreshToken, refreshIssueDate: new Date() }}
                }
              });

              this.zLog.info('Refresh Token Successfully updated');
            }

            return jwtEntry.token;
          } else {
            const tokenEntry = await this.tokenOpProv.findOneAndUpdate({
              query: {
                filter: { userId: currUserEntry.userId }, 
                update: { 
                  $set: {
                    token: jwToken, refreshToken: refreshToken,
                    issueDate: new Date(), refreshIssueDate: new Date()
                  }
                }
              }
            });

            this.zLog.success(`Token updated with User Id: ${currUserEntry.userId}`);

            return tokenEntry.token;
          }
        } else { throw new Error('Unknown error trying to find mToken entry.'); }
      } else { throw new Error('Passwords do not match.'); }
    } catch (err) {
      this.zLog.error(err);
      throw err;
    }
  }

  async register(opts: RegisterUserRequest): Promise<string> {
    try {
      const hashPassword = await this.crypt.encrypt(opts.password);
      this.zLog.info('Hashed User Password');
      opts.password = hashPassword;

      const newUser: IUser = first(await this.ledgerDb.mUser.insertMany([ opts ]));
      this.zLog.success(`New User added with User Id: ${newUser.userId}`);

      const jwToken = await this.jwt.sign(newUser.userId, jwtSecret, toMs.min(2));
      const refreshToken = await this.jwt.sign(newUser.userId, refreshSecret, toMs.min(2));

      const newAccessToken: IToken = {
        userId: newUser.userId,
        token: jwToken,
        refreshToken: refreshToken,
        issueDate: new Date(),
        refreshIssueDate: new Date(),
        expiresIn: toMs.min(2),
        refreshExpiresIn: toMs.min(2)
      };

      const resp = await this.tokenOpProv.insertOne(newAccessToken);
      this.zLog.success(`New Token added with User Id: ${resp.userId}`);

      return jwToken;
    } catch (err) {
      this.zLog.error(err);
      throw err;
    }
  }

  async checkToken(userId: string, token: string) {
    const tokenEntry: IToken = await this.tokenOpProv.findOne({ query: { userId }});
    if (every([ tokenEntry, tokenEntry?.token === token ])) {
      const jwtEntry = await this.jwt.verified(tokenEntry.token);
      const isWithinExpiration = this.jwt.withinExpiration(tokenEntry.issueDate, tokenEntry.expiresIn);
      return every([ jwtEntry.verified, isWithinExpiration ]);
    }

    return false;
  }
}