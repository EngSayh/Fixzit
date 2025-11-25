// Lightweight typed wrappers for Mongoose-like query chains used by the search API

type MongooseSort =
  | Record<string, 1 | -1 | "asc" | "desc" | "ascending" | "descending">
  | string
  | [string, 1 | -1][]
  | undefined
  | null;

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

export function makeQueryableModel<T>(model: {
  find: (filter: MongooseFilter) => MongooseQueryChain<T>;
}): QueryableModel<T> {
  const wrapChain = (chain: MongooseQueryChain<T>): QueryChain<T> => ({
    sort(sortParam: MongooseSort) {
      const next = chain.sort(sortParam);
      return wrapChain(next);
    },
    limit(limitParam: number) {
      const next = chain.limit(limitParam);
      return wrapChain(next);
    },
    async lean() {
      return await chain.lean();
    },
  });

  return {
    find(filterParam: MongooseFilter) {
      return wrapChain(model.find(filterParam));
    },
  } as QueryableModel<T>;
}
