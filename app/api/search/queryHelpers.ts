// Lightweight typed wrappers for Mongoose-like query chains used by the search API

export type QueryChain<T> = {
  sort(sort: any): QueryChain<T>;
  limit(n: number): QueryChain<T>;
  lean(): Promise<T[]>;
};

export type QueryableModel<T> = {
  find(filter: any): QueryChain<T>;
};

export function makeQueryableModel<T>(model: any): QueryableModel<T> {
  const wrapChain = (chain: any): QueryChain<T> => ({
    sort(sort: any) {
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
    find(filter: any) {
      return wrapChain(model.find(filter));
    }
  } as QueryableModel<T>;
}

