// Tests for Arabic i18n dictionary
// Framework: Vitest (describe/it/expect)

type Dict = Record<string, any>;

async function loadArabicDict(): Promise<Dict> {
  try {
    const mod = await import('../ar');
    return (mod as any).default ?? mod;
  } catch (e) {
    throw new Error(
      'Unable to load Arabic dictionary from ../ar. ' +
      'Ensure the dictionary is exported. Error: ' + String(e)
    );
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function walkLeaves(obj: Record<string, unknown>, path: string[] = []): Array<{ path: string; value: unknown }> {
  const out: Array<{ path: string; value: unknown }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = [...path, k];
    if (isPlainObject(v)) {
      out.push(...walkLeaves(v as Record<string, unknown>, p));
    } else {
      out.push({ path: p.join('.'), value: v });
    }
  }
  return out;
}

describe.skip('i18n Arabic dictionary (ar)', () => {
  let ar: Dict;

  beforeAll(async () => {
    ar = await loadArabicDict();
  });

  it('exports a plain object as default', () => {
    expect(ar).toBeDefined();
    expect(typeof ar).toBe('object');
    expect(Array.isArray(ar)).toBe(false);
  });

  it('contains expected top-level sections', () => {
    for (const key of [
      'common',
      'header',
      'nav',
      'dashboard',
      'workOrders',
      'finance',
      'maintenance',
      'orders',
      'landing',
      'footer',
      'settings',
    ]) {
      expect(ar).toHaveProperty(key);
      expect(isPlainObject(ar[key])).toBe(true);
    }
  });

  it('common.appName and common.brand are correctly set', () => {
    expect(ar.common?.appName).toBe('فيكزت إنتربرايز');
    expect(ar.common?.brand).toBe('فيكزت إنتربرايز');
  });

  it('common.actions strings are present and non-empty', () => {
    const actions = ar.common?.actions;
    expect(actions).toBeDefined();
    expect(actions.save).toBe('حفظ');
    expect(actions.cancel).toBe('إلغاء');
    expect(actions.close).toBe('إغلاق');
    for (const k of Object.keys(actions)) {
      const v = actions[k];
      expect(typeof v).toBe('string');
      expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  it('header and nav contain notifications with consistent Arabic label', () => {
    expect(ar.header?.notifications).toBe('الإشعارات');
    expect(ar.nav?.notifications).toBe('الإشعارات');
  });

  it('preferences.language matches common.language', () => {
    expect(ar.common?.language).toBe('اللغة');
    expect(ar.settings?.preferencesSettings?.language).toBe('اللغة');
  });

  it('contains expected specific fields and values', () => {
    expect(ar.common?.search).toBe('بحث');
    expect(ar.common?.loading).toBe('جاري التحميل...');
    expect(ar.dashboard?.title).toBe('لوحة التحكم');
    expect(ar.workOrders?.title).toBe('أوامر العمل');
    expect(ar.orders?.purchaseOrders).toBe('أوامر الشراء');
    expect(ar.settings?.preferencesSettings?.riyadh).toBe('آسيا/الرياض (GMT+3)');
    expect(ar.settings?.preferencesSettings?.english).toBe('الإنجليزية');
    expect(ar.settings?.preferencesSettings?.arabic).toBe('العربية');
  });

  it('all leaf values are strings and non-empty', () => {
    const leaves = walkLeaves(ar);
    expect(leaves.length).toBeGreaterThan(0);
    for (const { path, value } of leaves) {
      expect(typeof value).toBe('string');
      expect((value as string).trim().length).toBeGreaterThan(0);
    }
  });

  it('does not contain unexpected placeholders like {{ or }} in strings', () => {
    const leaves = walkLeaves(ar);
    // Allow common i18n interpolation patterns like {{count}}, {{name}}, etc.
    const validInterpolations = /^{{(count|name|value|date|time|id|username|email)}}/i;
    const offenders = leaves.filter(({ value }) => {
      const str = String(value);
      // Has placeholders
      if (/{{|}}/.test(str)) {
        // But not valid interpolations
        return !validInterpolations.test(str);
      }
      return false;
    });
    expect(offenders).toEqual([]);
  });

  it('uses consistent Arabic script for key display strings where applicable', () => {
    // This is a light heuristic: ensure there are Arabic letters in several key fields
    const samples = [
      ar.common?.appName,
      ar.common?.brand,
      ar.nav?.dashboard,
      ar.footer?.description,
      ar.settings?.securitySettings?.title,
    ];
    for (const s of samples) {
      expect(typeof s).toBe('string');
      // Arabic Unicode block heuristic
      expect(/[؀-ۿ]/.test(String(s))).toBe(true);
    }
  });

  it('does not introduce accidental English words in critical labels', () => {
    // Allow punctuation, digits, parentheses, +, /, spaces; flag common ASCII letter sequences
    const critical = [
      ar.common?.appName,
      ar.nav?.dashboard,
      ar.dashboard?.title,
      ar.footer?.brand,
      ar.settings?.preferencesSettings?.title,
    ];
    for (const s of critical) {
      const hasAsciiLetters = /[A-Za-z]{3,}/.test(String(s));
      expect(hasAsciiLetters).toBe(false);
    }
  });

  it('specific cross-section keys align semantically', () => {
    // "settings.tabs.notifications" should align with "header.notifications" value label
    expect(ar.settings?.tabs?.notifications).toBe('الإشعارات');
    expect(ar.header?.notifications).toBe('الإشعارات');
  });
});
