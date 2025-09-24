import { MockModel } from '@/src/lib/mockDb';

class EmployeeModel extends MockModel {
  constructor() { super('employees'); }
}

export const Employee: any = new EmployeeModel();

