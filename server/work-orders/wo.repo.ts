// Stub repository for work orders
export const findAll = async () => [];
export const findById = async (id: string) => null;
export const create = async (data: any) => ({ _id: 'stub', ...data });
export const update = async (id: string, data: any) => ({ _id: id, ...data });
export const deleteById = async (id: string) => true;
