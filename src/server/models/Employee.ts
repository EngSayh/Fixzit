// Mock Employee model for HR functionality
export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  hireDate: Date;
  salary?: {
    amount: number;
    currency: string;
  };
  status: 'active' | 'inactive' | 'terminated';
  manager?: string; // Manager employee ID
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mock implementation - replace with actual database integration
export class EmployeeModel {
  static async findById(id: string): Promise<Employee | null> {
    // Mock implementation
    return {
      id,
      employeeNumber: `EMP-${id.slice(-4).toUpperCase()}`,
      firstName: 'Ahmad',
      lastName: 'Al-Saudi',
      email: 'ahmad.alsaudi@fixzit.co',
      phone: '+966501234567',
      department: 'Engineering',
      position: 'Software Engineer',
      hireDate: new Date(),
      salary: {
        amount: 100000,
        currency: 'SAR'
      },
      status: 'active',
      tenantId: 'default',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async create(data: Partial<Employee>): Promise<Employee> {
    // Mock implementation
    const id = `emp-${Date.now()}`;
    return {
      id,
      employeeNumber: data.employeeNumber || `EMP-${id.slice(-4).toUpperCase()}`,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone,
      department: data.department || '',
      position: data.position || '',
      hireDate: data.hireDate || new Date(),
      salary: data.salary,
      status: data.status || 'active',
      manager: data.manager,
      tenantId: data.tenantId || 'default',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async findByTenant(tenantId: string): Promise<Employee[]> {
    // Mock implementation
    return [
      await this.findById('emp-1'),
      await this.findById('emp-2')
    ].filter(Boolean) as Employee[];
  }

  static async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    // Mock implementation
    const existing = await this.findById(id);
    if (!existing) return null;

    return {
      ...existing,
      ...data,
      updatedAt: new Date()
    };
  }
}