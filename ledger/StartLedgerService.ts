import { InitLedgerService } from '@ledger/InitLedgerService';
import { serverConfiguration } from '../ServerConfigurations';

const server = new InitLedgerService(
  serverConfiguration.basePath,
  serverConfiguration.systems.ledger.name,
  serverConfiguration.systems.ledger.port,
  serverConfiguration.systems.ledger.version,
  serverConfiguration.systems.ledger.numOfCpus
);

try {
  server.startServer();
} catch (err) { console.log(err); }