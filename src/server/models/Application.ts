// Mock Application model for ATS functionality
export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: 'pending' | 'reviewing' | 'interviewed' | 'hired' | 'rejected';
  stage?: string;
  score?: number;
  appliedAt: Date;
  updatedAt: Date;
  notes?: string | Array<{
    author: string;
    text: string;
    createdAt: Date;
    isPrivate: boolean;
  }>;
  history?: Array<{
    action: string;
    by: string;
    at: Date;
    details: string;
  }>;
}

// Mock implementation - replace with actual database integration
export class ApplicationModel {
  static async findById(id: string): Promise<Application | null> {
    // Mock implementation
    return {
      id,
      jobId: 'job-1',
      candidateId: 'candidate-1',
      status: 'pending',
      appliedAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async create(data: Partial<Application>): Promise<Application> {
    // Mock implementation
    return {
      id: `app-${Date.now()}`,
      jobId: data.jobId || '',
      candidateId: data.candidateId || '',
      status: data.status || 'pending',
      appliedAt: new Date(),
      updatedAt: new Date(),
      ...data
    } as Application;
  }

  static async update(id: string, data: Partial<Application>): Promise<Application | null> {
    // Mock implementation
    const existing = await this.findById(id);
    if (!existing) return null;

    return {
      ...existing,
      ...data,
      updatedAt: new Date()
    };
  }

  static async findOne(filter: any): Promise<Application | null> {
    // Mock implementation
    if (filter.id) {
      return this.findById(filter.id);
    }
    return null;
  }
}