import { Request, Response, NextFunction } from 'express';
import lodash from 'lodash';
const { merge } = lodash;

import { BaseRoute, RouteOpts } from '@core/baseServer/core/BaseRoute';
import { LogProvider } from '@core/providers/LogProvider';
import { LedgerProvider } from '@ledger/providers/LedgerProvider';
import { AuthProvider } from '@ledger/providers/AuthProvider';
import { 
  BalanceRequest, TransactionsRequest, CreateTransactionRequest, LedgerRequests
} from '@ledger/models/LedgerRequest';
import { extractErrorMessage } from '@core/utils/Utils';
import { ledgerRouteMapping } from '@ledger/configs/LedgerRouteMapping';
import { SimpleQueueProvider } from '@core/providers/queue/SimpleQueueProvider';


const NAME = 'Ledger Route';

export class LedgerRoute extends BaseRoute {
  name = NAME;
  private zLog: LogProvider = new LogProvider(NAME);

  constructor(
    rootpath: string, 
    private ledgerProvider: LedgerProvider, private authProvider: AuthProvider, private ledgerTransactionQueue: SimpleQueueProvider
  ) {
    super(rootpath);

    this.router.post(ledgerRouteMapping.ledger.subRouteMappings.getBalance.name, this.getBalance.bind(this));
    this.router.post(ledgerRouteMapping.ledger.subRouteMappings.getTransactions.name, this.getTransactions.bind(this));
    this.router.post(ledgerRouteMapping.ledger.subRouteMappings.createTransaction.name, this.createTransaction.bind(this));
    
    this.ledgerQueueOn();
  }

  private async getBalance(req: Request, res: Response, next: NextFunction) {
    const getBalanceReq: BalanceRequest = req.body ?? {};
    await this.pipeRequest(
      { 
        method: ledgerRouteMapping.ledger.subRouteMappings.getBalance.key, 
        customMsg: ledgerRouteMapping.ledger.subRouteMappings.getBalance 
      }, 
      req, res, next, 
      getBalanceReq
    );
  }

  private async getTransactions(req: Request, res: Response, next: NextFunction) {
    const getTransactionReq: TransactionsRequest = req.body ?? {};
    await this.pipeRequest(
      { 
        method: ledgerRouteMapping.ledger.subRouteMappings.getTransactions.key, 
        customMsg: ledgerRouteMapping.ledger.subRouteMappings.getTransactions 
      }, 
      req, res, next, 
      getTransactionReq
    );
  }

  private async createTransaction(req: Request, res: Response, next: NextFunction) {
    const createTransactionReq: CreateTransactionRequest = req.body ?? {};
    await this.pipeRequest(
      { 
        method: ledgerRouteMapping.ledger.subRouteMappings.createTransaction.key, 
        customMsg: ledgerRouteMapping.ledger.subRouteMappings.createTransaction 
      }, 
      req, res, next, 
      createTransactionReq
    );
  }

  async validateRoute(req: Request, res: Response, next: NextFunction): Promise<boolean> {
    const userId: string = req.headers.userid as string;
    const token: string = req.headers.accesstoken as string;

    return this.authProvider.checkToken(userId, token);
  }

  async performRouteAction(opts: RouteOpts, req: Request, res: Response, next: NextFunction, params: LedgerRequests) {
    // inject userId, for now assume user has been validated and can access resource
    const updatedParams = merge(params, { userId: req.headers.userid as string });
    this.ledgerTransactionQueue.enqueue({ opts, res, updatedParams });
  }

  private ledgerQueueOn() {
    this.ledgerTransactionQueue.queueUpdate.on(this.ledgerTransactionQueue.eventName, async () => {
      if (this.ledgerTransactionQueue.length > 0) {
        const { opts, res, updatedParams } = this.ledgerTransactionQueue.dequeue();
        try {
          const resp = await this.ledgerProvider[opts.method](updatedParams);
          this.zLog.custom(opts.customMsg.customConsoleMessages[0], true);

          res
            .status(200)
            .send({ status: 'success', resp });
        } catch (err) {
          this.zLog.error(`Error on ${NAME} => ${err as Error}`);
          res
            .status(404)
            .send({ err: extractErrorMessage(err as Error) });
        }
      } 
    });
  }
}