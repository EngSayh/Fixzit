// Minimal mock Job model for build/runtime stability
import { MockModel } from '@/src/lib/mockDb';

type Doc = any;

class JobModel extends MockModel {
  constructor() { super('jobs'); }
  async findById(id: string) {
    const list: any[] = await (await (this as any).find({ _id: id })).exec();
    return list[0] || null;
  }
}

export const Job: any = new JobModel();

