import { 
  connect, createConnection, ConnectOptions,
  Connection, Schema, ClientSession
} from 'mongoose';

import { IMongoCredentials } from '@core/models/dataAccess/IMongoose';
import { LogProvider } from '@core/providers/LogProvider';


export const applySession = (session?: ClientSession): { session: ClientSession } => { if (session) return { session }; };

interface MongoUri { 
  fullUri: string;
}
interface MongoCreds {
  creds: IMongoCredentials;
}
interface MongoConnection extends Partial<MongoCreds>, Partial<MongoUri> {}
interface MongoInitOpts {
  connection: MongoConnection;
  overrideOpts?: ConnectOptions;
}

export abstract class MongooseProvider {
  conn: Connection;
  private zLog = new LogProvider('Mongoose Provider');

  constructor(private db: string) {}

  async initDefault(opts?: MongoInitOpts) {
    try {
      const connectionString = opts.connection?.fullUri ? opts.connection.fullUri : this.getNormalizeHost(opts.connection.creds);
      const connectionOpts = opts?.overrideOpts ? opts.overrideOpts : { maxPoolSize: 100 };
      const { connection } = await connect(connectionString, connectionOpts);
      
      this.conn = connection;
      this.dbOn(this.conn);
      this.initModels();
    } catch (err) { throw err; }
  }

  abstract initModels(): void;

  async createNewConnection(opts?: MongoInitOpts) {
    try {
      const connectionString = opts.connection?.fullUri ? opts.connection.fullUri : this.getNormalizeHost(opts.connection.creds);
      const connectionOpts = opts?.overrideOpts ? opts.overrideOpts : this.normalizeConnOptions();
      const newConn = await createConnection(connectionString, connectionOpts).asPromise();
  
      return newConn;
    } catch (err) { throw err; }
  }

  private dbOn(conn: Connection) {
    conn.on('open', () => this.zLog.info('Successfully made mongo connection'));
    conn.on('error', err => {
      this.zLog.error(err);
      throw err;
    });
  }

  private getNormalizeHost(creds: IMongoCredentials): string {
    return `mongodb://${creds.user}:${creds.password}@${creds.host}:${creds.port}/${this.db}`;
  }

  private normalizeConnOptions() {
    return {
      dbName: this.db,
      autoIndex: true,
      autoCreate: true
    }
  }

  addModel<T>(name: string, mongoSchema: Schema) { 
    return this.conn.model<T>(name, mongoSchema);
  }
}