// Lightweight typed wrappers for Mongoose-like query chains used by the search API

interface MongooseChainLike {
  sort(sort: Record<string, number>): MongooseChainLike;
  limit(n: number): MongooseChainLike;
  lean(): Promise<unknown[]>;
}

interface MongooseModelLike {
  find(filter: Record<string, unknown>): MongooseChainLike;
}

export type QueryChain<T> = {
  sort(sort: Record<string, number>): QueryChain<T>;
  limit(n: number): QueryChain<T>;
  lean(): Promise<T[]>;
};

export type QueryableModel<T> = {
  find(filter: Record<string, unknown>): QueryChain<T>;
};

export function makeQueryableModel<T>(model: MongooseModelLike): QueryableModel<T> {
  const wrapChain = (chain: MongooseChainLike): QueryChain<T> => ({
    sort(sort: Record<string, number>) {
      const next = chain.sort(sort);
      return wrapChain(next);
    },
    limit(n: number) {
      const next = chain.limit(n);
      return wrapChain(next);
    },
    async lean() {
      return await chain.lean() as T[];
    }
  });

  return {
    find(filter: Record<string, unknown>) {
      return wrapChain(model.find(filter));
    }
  } as QueryableModel<T>;
}

