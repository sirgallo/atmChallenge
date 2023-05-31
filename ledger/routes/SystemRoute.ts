import { Request, Response, NextFunction } from 'express';

import { BaseRoute, RouteOpts } from '@core/baseServer/core/BaseRoute';
import { LogProvider } from '@core/providers/LogProvider';
import { SystemProvider } from '@ledger/providers/SystemProvider';
import { UpdateFundsRequest, SystemRequests } from '@ledger/models/SystemRequest';
import { extractErrorMessage } from '@core/utils/Utils';
import { systemRouteMapping } from '@ledger/configs/SystemRouteMapping';


const NAME = 'System Route';

export class SystemRoute extends BaseRoute {
  name = NAME;
  private zLog: LogProvider = new LogProvider(NAME);

  constructor(rootpath: string, private systemProvider: SystemProvider) {
    super(rootpath);

    this.router.post(systemRouteMapping.system.subRouteMappings.getBalance.name, this.getBalance.bind(this));
    this.router.post(systemRouteMapping.system.subRouteMappings.addFunds.name, this.addFunds.bind(this));
  }

  private async getBalance(req: Request, res: Response, next: NextFunction) {
    await this.pipeRequest(
      { 
        method: systemRouteMapping.system.subRouteMappings.getBalance.key, 
        customMsg: systemRouteMapping.system.subRouteMappings.getBalance 
      }, 
      req, res, next, 
      {}
    );
  }

  private async addFunds(req: Request, res: Response, next: NextFunction) {
    const addFundsReq: UpdateFundsRequest = req.body;
    await this.pipeRequest(
      { 
        method: systemRouteMapping.system.subRouteMappings.getTransactions.key, 
        customMsg: systemRouteMapping.system.subRouteMappings.getTransactions 
      }, 
      req, res, next, 
      addFundsReq
    );
  }

  async validateRoute(req: Request, res: Response, next: NextFunction): Promise<boolean> {
    return true;
  }

  async performRouteAction(opts: RouteOpts, req: Request, res: Response, next: NextFunction, params: SystemRequests) {
    try {
      const resp = await this.systemProvider[opts.method](params);
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
}