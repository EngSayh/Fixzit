declare module "mongoose" {
  export type AnyObject = Record<string, any>;
  export type FilterQuery<T = any> = AnyObject;
  export type UpdateQuery<T = any> = AnyObject;
  export type QueryOptions<T = any> = AnyObject;
  export type SaveOptions = AnyObject;
  export type CreateOptions = AnyObject;
  export type HydratedDocument<T = any> = T & { _id?: any };
  export type Document<T = any> = T & { _id?: any };
  export type Schema<T = any> = AnyObject;
  export type SchemaTypes = AnyObject;

  export class Query<ResultType = any, DocType = any> {
    lean<TRet = ResultType>(): Query<TRet, DocType>;
    select(...args: any[]): Query<ResultType, DocType>;
    sort(...args: any[]): Query<ResultType, DocType>;
    populate(...args: any[]): Query<ResultType, DocType>;
    limit(...args: any[]): Query<ResultType, DocType>;
    skip(...args: any[]): Query<ResultType, DocType>;
    exec(): Promise<ResultType>;
    then: Promise<ResultType>["then"];
    catch: Promise<ResultType>["catch"];
  }

  export interface Model<T = any> {
    findOne<TRet = T>(...args: any[]): Query<TRet | null, T>;
    find<TRet = T>(...args: any[]): Query<TRet[], T>;
    findById<TRet = T>(...args: any[]): Query<TRet | null, T>;
    findOneAndUpdate<TRet = T>(...args: any[]): Query<TRet | null, T>;
    updateOne(...args: any[]): Query<any, T>;
    deleteMany(...args: any[]): Query<any, T>;
    exists(...args: any[]): Query<any, T>;
    countDocuments(...args: any[]): Query<number, T>;
    create<TRet = T>(doc: Partial<TRet> | Partial<TRet>[], options?: any): Promise<any>;
    aggregate(...args: any[]): any;
  }

  export const models: Record<string, Model<any>>;
  export function model<T = any>(name: string, schema?: any): Model<T>;
  export function connect(uri: string, options?: any): Promise<any>;
  export const Schema: any;
  export const Types: any;

  const mongoose: any;
  export default mongoose;
}
