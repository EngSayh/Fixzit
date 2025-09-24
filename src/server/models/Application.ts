import { MockModel } from '@/src/lib/mockDb';

class ApplicationModel extends MockModel {
  constructor() { super('applications'); }
}

export const Application: any = new ApplicationModel();

