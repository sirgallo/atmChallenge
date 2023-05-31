# Collections


Each collection within the mongo db has its own provider, which can be injected as a dependency onto other providers


## ledger

`--> handles keeping an immutable ledger of all transactions occuring on the atm`

```ts
export type LedgerOpType = 'deposit' | 'withdraw';
export interface ILedgerEntry {
  userId: string;
  operation: LedgerOpType;
  transactionSize: number;
  totalBalance: number;

  // injected
  createdAt?: Date;
  updatedAt?: Date;
}
```

the associated driver is under `@db/providers/LedgerOpProvider.ts`.


## user

`--> handles user accounts on the atm`

```ts
export interface IUser {
  userId: string;
  email: string;
  phone: string;
  password: string;

  // injected
  createdAt?: Date;
  updatedAt?: Date;
}
```

the associated driver is under `@db/providers/UserOpProvider.ts`.


## token

`--> handles the json web tokens and refresh tokens associated with authentication`

```ts
export interface IToken {
  userId: string;
  token: string;
  refreshToken: string;
  issueDate: Date;
  refreshIssueDate: Date;
  expiresIn: number;
  refreshExpiresIn: number;

  // injected
  createdAt?: Date;
  updatedAt?: Date;
}
```

the associated driver is under `@db/providers/TokenOpProvider.ts`.


## system

`--> handles the systems, including system balance`

```ts
export interface ISystem {
  sysId: string;
  balance: number;

  // injected
  createdAt?: Date;
  updatedAt?: Date;
}
```

the associated driver is under `@db/providers/SystemOpProvider.ts`.