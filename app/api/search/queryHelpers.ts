// Lightweight typed wrappers for Mongoose-like query chains used by the search API

type MongooseSort = Record<string, 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending'> | string | [string, 1 | -1][] | undefined | null;

type MongooseFilter = Record<string, unknown>;

interface MongooseQueryChain<T> {
  sort(sort: MongooseSort): MongooseQueryChain<T>;
  limit(n: number): MongooseQueryChain<T>;
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

