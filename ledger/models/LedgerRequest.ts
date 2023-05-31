import { ILedgerEntry } from '@db/models/Ledger';


export interface BalanceRequest {
  userId?: string;
}

export interface TransactionsRequest {
  userId?: string;
}

export interface CreateTransactionRequest extends Pick<ILedgerEntry, 'operation' | 'transactionSize'> {
  userId?: string;
}

export type BalanceResponse = Pick<ILedgerEntry, 'totalBalance'>;

export interface TransactionsResponse {
  transactions: ILedgerEntry[];
}

export interface CreateTransactionResponse {
  success: boolean;
}

export type LedgerRequests = BalanceRequest 
  | TransactionsRequest
  | CreateTransactionRequest;