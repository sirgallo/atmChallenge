import { ClientSession, FilterQuery, UpdateQuery } from 'mongoose';


export abstract class BaseMongooseOpProvider<T> {
  abstract findOne(opts: { query: FilterQuery<T>, session?: ClientSession }): Promise<T>;
  abstract insertOne(newEntry: T, opts?: { session: ClientSession }): Promise<T>;
  abstract deleteOne(opts: { query: FilterQuery<T>, session?: ClientSession }): Promise<boolean>;
  abstract findOneAndUpdate(opts:{ query: { filter: FilterQuery<T>, update: UpdateQuery<T> }, session?: ClientSession }): Promise<T>
}