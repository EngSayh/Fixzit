import { MockModel } from '@/src/lib/mockDb';

class AtsSettingsModel extends MockModel {
  constructor() { super('ats_settings'); }
  async findOrCreateForOrg(orgId: string) {
    const list: any[] = await (await this.find({ orgId })).exec();
    let settings = list[0];
    if (!settings) {
      settings = await this.create({
        orgId,
        scoringWeights: { skills: 0.6, experience: 0.4 },
        knockoutRules: { minYears: 0 }
      });
    }
    return {
      ...settings,
      shouldAutoReject: ({ experience, skills }: { experience: number; skills: string[] }) => ({ reject: false, reason: undefined })
    };
  }
}

export const AtsSettings: any = new AtsSettingsModel();

