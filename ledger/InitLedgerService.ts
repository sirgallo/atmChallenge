import { randomBytes } from 'crypto';

import { BaseServer } from '@baseServer/core/BaseServer';
import { mergeBaseRoutePath } from '@baseServer/core/utils/mergeBaseRoutePath';
import { SimpleQueueProvider } from '@core/providers/queue/SimpleQueueProvider';
import { LedgerMongooseProvider } from '@db/providers/LedgerMongooseProvider';
import { AuthProvider } from '@ledger/providers/AuthProvider';
import { LedgerProvider } from '@ledger/providers/LedgerProvider';
import { SystemProvider } from '@ledger/providers/SystemProvider';
import { LedgerRoute } from '@ledger/routes/LedgerRoute';
import { AuthRoute } from '@ledger/routes/AuthRoute';
import { SystemRoute } from '@ledger/routes/SystemRoute';
import { ISystem } from '@db/models/System';
import { dbConf } from '@db/DbConf';
import { mongoTestConfig } from '@ledger/configs/MongoTestConfig';
import { ledgerRouteMapping } from '@ledger/configs/LedgerRouteMapping';
import { authRouteMapping } from '@ledger/configs/AuthRouteMapping';
import { systemRouteMapping } from '@ledger/configs/SystemRouteMapping';
import { SystemOpProvider } from '@db/providers/SystemOpProvider';


const LEDGER_OP_EVENT = 'Ledger Op Event';
const HASH_LENGTH = 64;
const HASH_ENCODING = 'hex';

const genHash = (): string => randomBytes(HASH_LENGTH).toString(HASH_ENCODING);


export class InitLedgerService extends BaseServer {
  constructor(private basePath: string, name: string, port?: number, version?: string, numOfCpus?: number) { 
    super(name, port, version, numOfCpus); 
  }

  async initService(): Promise<boolean> {
    try {
      // init db at top level and inject into providers
      const ledgerDb = new LedgerMongooseProvider(dbConf.ledgerModels.name);
      await ledgerDb.initDefault({ connection: { creds: mongoTestConfig }});

      const ledgerTransactionQueue: SimpleQueueProvider = new SimpleQueueProvider(LEDGER_OP_EVENT);

      const currSys: ISystem = await this.initSystem(ledgerDb);
      
      const authProv = new AuthProvider(ledgerDb);
      const sysProv = new SystemProvider(ledgerDb, currSys.sysId);
      const ledgerProv = new LedgerProvider(ledgerDb, sysProv);

      const ledgerRoute = new LedgerRoute(mergeBaseRoutePath(this.basePath, ledgerRouteMapping.ledger.name), ledgerProv, authProv, ledgerTransactionQueue);
      const authRoute = new AuthRoute(mergeBaseRoutePath(this.basePath, authRouteMapping.auth.name), authProv);
      const sysRoute = new SystemRoute(mergeBaseRoutePath(this.basePath, systemRouteMapping.system.name), sysProv);

      this.setRoutes([ ledgerRoute, authRoute, sysRoute ]);

      return true;
    } catch (err) {
      this.zLog.error(err);
      throw err;
    }
  }

  private async initSystem(ledgerDb: LedgerMongooseProvider): Promise<ISystem> {
    const newSys: ISystem = { 
      sysId: genHash(),
      balance: 10000
    };

    const sysOpProv = new SystemOpProvider(ledgerDb);
    return sysOpProv.insertOne(newSys);
  }
}