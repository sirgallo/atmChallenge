import { 
  ServerConfigMapping, ServerConfigurations,ServerConfiguration 
} from '@core/baseServer/core/models/ServerConfiguration';


export const systems: ServerConfigurations<Record<string, ServerConfiguration>> = {
  ledger: {
    port: 1098,
    name: 'Ledger API',
    numOfCpus: 1,
    version: '0.0.1-dev'
  }
};

export const serverConfiguration: ServerConfigMapping = {
  basePath: '/b_v1',
  systems
};