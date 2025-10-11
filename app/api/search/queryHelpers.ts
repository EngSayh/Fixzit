// Lightweight typed wrappers for Mongoose-like query chains used by the search API

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MongooseSort = Record<string, 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending'> | string | [string, 1 | -1][] | undefined | null | any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MongooseFilter = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface MongooseQueryChain<T = any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sort(sort: MongooseSort): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  limit(n: number): any;
  lean(): Promise<T[]>;
}

export type QueryChain<T> = {
  sort(sort: MongooseSort): QueryChain<T>;
  limit(n: number): QueryChain<T>;
  lean(): Promise<T[]>;
};

export type QueryableModel<T> = {
  find(filter: MongooseFilter): QueryChain<T>;
};

export function makeQueryableModel<T>(model: { find: (filter: MongooseFilter) => MongooseQueryChain<T> }): QueryableModel<T> {
  const wrapChain = (chain: MongooseQueryChain<T>): QueryChain<T> => ({
    sort(sort: MongooseSort) {
      const next = chain.sort(sort);
      return wrapChain(next);
    },
    limit(n: number) {
      const next = chain.limit(n);
      return wrapChain(next);
    },
    async lean() {
      return await chain.lean();
    }
  });

  return {
    find(filter: MongooseFilter) {
      return wrapChain(model.find(filter));
    }
  } as QueryableModel<T>;
}

