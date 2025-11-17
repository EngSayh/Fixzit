'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RepricerSettings {
  enabled: boolean;
  rules: Record<string, {
    enabled: boolean;
    minPrice: number;
    maxPrice: number;
    targetPosition: 'win' | 'competitive';
    undercut: number;
    protectMargin: boolean;
  }>;
  defaultRule?: {
    enabled: boolean;
    minPrice: number;
    maxPrice: number;
    targetPosition: 'win' | 'competitive';
    undercut: number;
    protectMargin: boolean;
  };
}

interface Props {
  settings: RepricerSettings;
  onUpdate: (_updatedSettings: RepricerSettings) => void;
}

export default function PricingRuleCard({ settings, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [localRule, setLocalRule] = useState(settings.defaultRule || {
    enabled: true,
    minPrice: 0,
    maxPrice: 1000,
    targetPosition: 'win' as const,
    undercut: 0.01,
    protectMargin: true
  });

  const handleSave = async () => {
    try {
      const newSettings = {
        ...settings,
        defaultRule: localRule
      };

      const response = await fetch('/api/souq/repricer/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings })
      });

      if (!response.ok) throw new Error('Failed to save settings');

      onUpdate(newSettings);
      setEditing(false);
    } catch (_error) {
      alert('Failed to save pricing rules');
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          <strong>Default Rule:</strong> This rule applies to all listings that don't have specific rules configured.
        </AlertDescription>
      </Alert>

      {!editing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <span className={`text-sm font-semibold ${localRule.enabled ? 'text-green-600' : 'text-gray-600'}`}>
              {localRule.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Price Range</span>
            <span className="text-sm text-gray-900">
              SAR {localRule.minPrice.toFixed(2)} - {localRule.maxPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Target Position</span>
            <span className="text-sm text-gray-900 capitalize">{localRule.targetPosition}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Undercut Amount</span>
            <span className="text-sm text-gray-900">SAR {localRule.undercut.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Protect Margin</span>
            <span className="text-sm text-gray-900">{localRule.protectMargin ? 'Yes' : 'No'}</span>
          </div>
          <Button onClick={() => setEditing(true)} className="w-full">
            Edit Rules
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="rule-enabled">Enable Rule</Label>
            <Switch
              id="rule-enabled"
              checked={localRule.enabled}
              onCheckedChange={(checked) => setLocalRule({ ...localRule, enabled: checked })}
            />
          </div>

          {/* Min Price */}
          <div>
            <Label htmlFor="min-price">Minimum Price (SAR)</Label>
            <Input
              id="min-price"
              type="number"
              step="0.01"
              value={localRule.minPrice}
              onChange={(e) => setLocalRule({ ...localRule, minPrice: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-gray-500 mt-1">Never go below this price</p>
          </div>

          {/* Max Price */}
          <div>
            <Label htmlFor="max-price">Maximum Price (SAR)</Label>
            <Input
              id="max-price"
              type="number"
              step="0.01"
              value={localRule.maxPrice}
              onChange={(e) => setLocalRule({ ...localRule, maxPrice: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-gray-500 mt-1">Never exceed this price</p>
          </div>

          {/* Target Position */}
          <div>
            <Label htmlFor="target-position">Target Position</Label>
            <select
              id="target-position"
              value={localRule.targetPosition}
              onChange={(e) => setLocalRule({ ...localRule, targetPosition: e.target.value as 'win' | 'competitive' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="win">Win Buy Box (most aggressive)</option>
              <option value="competitive">Stay Competitive (balanced)</option>
            </select>
          </div>

          {/* Undercut Amount */}
          <div>
            <Label htmlFor="undercut">Undercut Amount (SAR)</Label>
            <Input
              id="undercut"
              type="number"
              step="0.01"
              value={localRule.undercut}
              onChange={(e) => setLocalRule({ ...localRule, undercut: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-gray-500 mt-1">
              How much to undercut the lowest competitor (e.g., 0.01 SAR)
            </p>
          </div>

          {/* Protect Margin */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="protect-margin">Protect Margin</Label>
              <p className="text-xs text-gray-500">Don't drop below min price even if losing Buy Box</p>
            </div>
            <Switch
              id="protect-margin"
              checked={localRule.protectMargin}
              onCheckedChange={(checked) => setLocalRule({ ...localRule, protectMargin: checked })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
            <Button onClick={() => setEditing(false)} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
