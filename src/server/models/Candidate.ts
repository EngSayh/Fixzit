import { MockModel } from '@/src/lib/mockDb';

class CandidateModel extends MockModel {
  constructor() { super('candidates'); }
  async findByEmail(orgId: string, email: string) {
    const list: any[] = await (await this.find({})).exec();
    return list.find(c => c.orgId === orgId && c.email === email) || null;
  }
}

export const Candidate: any = new CandidateModel();

