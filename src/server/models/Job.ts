// Mock Job model for ATS functionality
export interface Job {
  id: string;
  title: string;
  description: string;
  department: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'draft' | 'published' | 'closed' | 'pending';
  requirements: string[];
  benefits: string[];
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  postedAt: Date;
  closingDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Mock implementation - replace with actual database integration
export class JobModel {
  static async findById(id: string): Promise<Job | null> {
    // Mock implementation
    return {
      id,
      title: 'Software Engineer',
      description: 'We are looking for a talented software engineer...',
      department: 'Engineering',
      location: 'Riyadh, Saudi Arabia',
      type: 'full-time',
      status: 'published',
      requirements: ['Bachelor\'s degree in Computer Science', '3+ years experience'],
      benefits: ['Health insurance', 'Flexible working hours'],
      salaryRange: {
        min: 80000,
        max: 120000,
        currency: 'SAR'
      },
      postedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async findAll(filter?: any): Promise<Job[]> {
    // Mock implementation
    return [
      await this.findById('job-1'),
      await this.findById('job-2')
    ].filter(Boolean) as Job[];
  }

  static async create(data: Partial<Job>): Promise<Job> {
    // Mock implementation
    return {
      id: `job-${Date.now()}`,
      title: data.title || '',
      description: data.description || '',
      department: data.department || '',
      location: data.location || '',
      type: data.type || 'full-time',
      status: data.status || 'draft',
      requirements: data.requirements || [],
      benefits: data.benefits || [],
      salaryRange: data.salaryRange,
      postedAt: data.postedAt || new Date(),
      closingDate: data.closingDate,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async findOne(filter: any): Promise<Job | null> {
    // Mock implementation - would normally query database
    if (filter.id) {
      return this.findById(filter.id);
    }
    return null;
  }

  static async find(filter: any, projection?: any): Promise<{
    skip: (n: number) => any;
    limit: (n: number) => any;
    sort: (s: any) => any;
    toArray: () => Promise<Job[]>;
  }> {
    // Mock implementation - return chainable query builder
    const mockJobs = await this.findAll();
    
    return {
      skip: (n: number) => ({
        limit: (limit: number) => ({
          sort: (s: any) => ({
            toArray: async () => mockJobs.slice(n, n + limit)
          })
        })
      }),
      limit: (n: number) => ({
        sort: (s: any) => ({
          toArray: async () => mockJobs.slice(0, n)
        })
      }),
      sort: (s: any) => ({
        toArray: async () => mockJobs
      }),
      toArray: async () => mockJobs
    };
  }

  static async countDocuments(filter: any): Promise<number> {
    // Mock implementation
    const jobs = await this.findAll();
    return jobs.length;
  }
}