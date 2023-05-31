import { ClientSession } from 'mongoose';

import { 
  BalanceRequest, TransactionsRequest, CreateTransactionRequest,
  BalanceResponse, TransactionsResponse
} from '@ledger/models/LedgerRequest';
import { SysBalanceResponse, UpdateFundsRequest } from '@ledger/models/SystemRequest';
import { AuthenticateUserRequest, RegisterUserRequest } from '@ledger/models/AuthRequest';
import { ILedgerEntry } from '@db/models/Ledger';


export interface LedgerEndpoints {
  getBalance(opts: BalanceRequest): Promise<BalanceResponse>;
  getTransactions(opts: TransactionsRequest): Promise<TransactionsResponse>;
  createTransaction(opts: CreateTransactionRequest): Promise<ILedgerEntry>;
}

export interface SystemEndpoints {
  getBalance(session?: ClientSession): Promise<SysBalanceResponse>;
  updateFunds(opts: UpdateFundsRequest, session?: ClientSession): Promise<boolean>;
}

export interface AuthEndpoints {
  authenticate(opts: AuthenticateUserRequest): Promise<string>;
  register(opts: RegisterUserRequest): Promise<string>;
}