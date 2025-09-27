// Mock ATS Settings model
export interface AtsSettings {
  id: string;
  tenantId: string;
  emailNotifications: boolean;
  autoReject: boolean;
  scoringEnabled: boolean;
  minimumScore: number;
  integrations: {
    linkedin: boolean;
    indeed: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Mock implementation
export class AtsSettingsModel {
  static async findByTenant(tenantId: string): Promise<AtsSettings | null> {
    // Mock implementation
    return {
      id: `ats-settings-${tenantId}`,
      tenantId,
      emailNotifications: true,
      autoReject: false,
      scoringEnabled: true,
      minimumScore: 70,
      integrations: {
        linkedin: true,
        indeed: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async create(data: Partial<AtsSettings>): Promise<AtsSettings> {
    return {
      id: `ats-settings-${Date.now()}`,
      tenantId: data.tenantId || 'default',
      emailNotifications: data.emailNotifications ?? true,
      autoReject: data.autoReject ?? false,
      scoringEnabled: data.scoringEnabled ?? true,
      minimumScore: data.minimumScore ?? 70,
      integrations: data.integrations || {
        linkedin: true,
        indeed: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}