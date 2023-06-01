# Key Val Store CLI/Provider

`A command line tool for interacting with the key-val store`
*performed within main project directory* [@root](../)


## Building

**currently using node 18**

```bash
  npm install
  npm run build:all
```


## Arguments

Command line arguments should be as follows:

```
  --operation=<getBalance | getTransactions | createTransaction | authenticate | register>
  --payload=<BalanceRequest | TransactionsRequest | CreateTransactionRequest | AuthenticateUserRequest | RegisterUserRequest>
  --userId=<userId> (required for Ledger Transactions, injected in header of request, not required for auth)
  --bypassSSLVerification=<boolean> (optional, only for self signed certs) --> this is required locally for testing
  --host=<host> (optional)  --> this will resolve to hostname of machine otherwise
  --port=<port> (optional)
  --https=<boolean> (optional)
```

## Operations - Client Operations

`getBalance - get balance for current user`
```bash
  npm run cli -- --operation=getBalance --payload='{}' --userId=testuser --bypassSSLVerification=true
```

`getTransactions - get a list of transactions from past 30 days, in descending order`
```bash
  npm run cli -- --operation=getTransactions --payload='{}' --userId=testuser --bypassSSLVerification=true
```

`createTransaction - withdraw or deposit funds from the atm`
```bash
  npm run cli -- --operation=createTransaction --payload='{"operation": "deposit","transactionSize": 1000}' --userId=testuser --bypassSSLVerification=true
```

`authenticate - authenticate user`
```bash
  npm run cli -- --operation=authenticate --payload='{"email": "testemail","password": "testpass"}' --bypassSSLVerification=true
```

`register - register user`
```bash
  npm run cli -- --operation=register --payload='{"userId": "testuser","email": "testemail","password": "testpass","phone": "1234567890"}' --bypassSSLVerification=true
```


## Cert Gen

`check out @certs/ to generate self signed certs.`


## Auth

When a user is first registered, or the user is authenticating themselves, a json web token is written to storage locally so that passwords are not required on every operation.
This token does have a time span before needing to be refreshed, but contains a longer lasting refresh token stored server side so that, if needed, the token can be refreshed automatically on a request.


## Importing into Project

```ts
import { CLIProvider } from '@cli/providers/CLIProvider';

const resp = await this.cliProv[<method>](<payload>);
```