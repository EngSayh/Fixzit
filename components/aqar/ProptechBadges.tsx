'use client';

import { Zap, Wifi, Lock, Shield, Wind, Sun } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import type { IListingProptech, IListingIotFeature } from '@/models/aqar/Listing';

interface ProptechBadgesProps {
  proptech?: IListingProptech;
  iotFeatures?: IListingIotFeature[];
}

const FEATURE_ICONS: Record<string, typeof Zap> = {
  SMART_LOCKS: Lock,
  ENERGY_MONITORING: Zap,
  WATER_LEAK_SENSORS: Shield,
  AIR_QUALITY: Wind,
  SOLAR: Sun,
  EV_CHARGER: Zap,
  SECURITY_AI: Shield,
};

const FEATURE_LABEL_KEYS: Record<string, string> = {
  SMART_LOCKS: 'aqar.proptech.features.smartLocks',
  ENERGY_MONITORING: 'aqar.proptech.features.energyMonitoring',
  WATER_LEAK_SENSORS: 'aqar.proptech.features.waterLeakSensors',
  AIR_QUALITY: 'aqar.proptech.features.airQuality',
  SOLAR: 'aqar.proptech.features.solar',
  EV_CHARGER: 'aqar.proptech.features.evCharger',
  SECURITY_AI: 'aqar.proptech.features.securityAi',
};

export function ProptechBadges({ proptech, iotFeatures }: ProptechBadgesProps) {
  const { t } = useTranslation();
  if (!proptech) {
    return null;
  }
  const level = proptech.smartHomeLevel || 'NONE';
  const vendorCount = proptech.iotVendors?.length ?? 0;
  const vendorLabel = t('aqar.proptech.vendors', `${vendorCount} تكامل`);
  const smartSummary = iotFeatures && iotFeatures.length > 0
    ? t('aqar.proptech.smartSummary', `مزايا ذكية (${iotFeatures.length})`)
    : '';
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {t('aqar.proptech.title', 'PropTech & IoT')}
          </p>
          <p className="text-lg font-semibold text-foreground">
            {level === 'ADVANCED'
              ? t('aqar.proptech.level.advanced', 'أنظمة متقدمة')
              : level === 'BASIC'
                ? t('aqar.proptech.level.basic', 'مزايا أساسية')
                : t('aqar.proptech.level.none', 'بدون أتمتة')}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {vendorLabel}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {(proptech.features || []).map((feature) => {
          const Icon = FEATURE_ICONS[feature] || Wifi;
          const labelKey = FEATURE_LABEL_KEYS[feature];
          const fallbackLabel = feature.replace(/_/g, ' ');
          const label = labelKey ? t(labelKey, fallbackLabel) : fallbackLabel;
          return (
            <span
              key={feature}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-foreground text-xs"
            >
              <Icon className="w-3 h-3" />
              {label}
            </span>
          );
        })}
        {proptech.solarReady && (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-xs">
            <Sun className="w-3 h-3" />
            {t('aqar.proptech.solar', 'جاهز للطاقة الشمسية')}
          </span>
        )}
        {proptech.evCharging && (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
            <Zap className="w-3 h-3" />
            {t('aqar.proptech.ev', 'شاحن EV')} 
          </span>
        )}
      </div>
      {iotFeatures && iotFeatures.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
            {smartSummary}
          </span>
          {iotFeatures.slice(0, 3).map((feature) => (
            <span key={`${feature.key}-${feature.label}`} className="px-3 py-1 rounded-full bg-muted text-foreground">
              {feature.label || feature.key}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProptechBadges;
