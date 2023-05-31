import { Request, Response, NextFunction } from 'express';

import { BaseRoute, RouteOpts } from '@core/baseServer/core/BaseRoute';
import { LogProvider } from '@core/providers/LogProvider';
import { AuthProvider } from '@ledger/providers/AuthProvider';
import { AuthenticateUserRequest, RegisterUserRequest, AuthRequests } from '@ledger/models/AuthRequest';
import { extractErrorMessage } from '@core/utils/Utils';
import { authRouteMapping } from '@ledger/configs/AuthRouteMapping';


const NAME = 'Auth Route';

export class AuthRoute extends BaseRoute {
  name = NAME;
  private zLog: LogProvider = new LogProvider(NAME);

  constructor(rootpath: string, private authProvider: AuthProvider) {
    super(rootpath);

    this.router.post(authRouteMapping.auth.subRouteMappings.authenticate.name, this.authenticate.bind(this));
    this.router.post(authRouteMapping.auth.subRouteMappings.register.name, this.register.bind(this));
  }

  private async authenticate(req: Request, res: Response, next: NextFunction) {
    const authReq: AuthenticateUserRequest = req.body;
    await this.pipeRequest(
      { 
        method: authRouteMapping.auth.subRouteMappings.authenticate.key, 
        customMsg: authRouteMapping.auth.subRouteMappings.authenticate 
      }, 
      req, res, next, 
      authReq
    );
  }

  private async register(req: Request, res: Response, next: NextFunction) {
    const registerReq: RegisterUserRequest = req.body;
    await this.pipeRequest(
      { 
        method: authRouteMapping.auth.subRouteMappings.register.key, 
        customMsg: authRouteMapping.auth.subRouteMappings.register 
      }, 
      req, res, next, 
      registerReq
    );
  }

  async validateRoute(req: Request, res: Response, next: NextFunction): Promise<boolean> {
    return true;
  }

  async performRouteAction(opts: RouteOpts, req: Request, res: Response, next: NextFunction, params: AuthRequests) {
    try {
      const resp = await this.authProvider[opts.method](params);
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