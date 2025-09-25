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
  return {
    find(filter: any) {
      const chain = model.find(filter);
      return {
        sort(sort: any) {
          chain.sort(sort);
          return this as QueryChain<T>;
        },
        limit(n: number) {
          chain.limit(n);
          return this as QueryChain<T>;
        },
        async lean() {
          return await chain.lean();
        }
      } as QueryChain<T>;
    }
  } as QueryableModel<T>;
}

