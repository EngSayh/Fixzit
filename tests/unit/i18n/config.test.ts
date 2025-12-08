// Testing framework: Vitest
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  LOCALE_META,
  Locale,
} from "@/i18n/config";

describe("i18n config", () => {
  describe("DEFAULT_LOCALE", () => {
    it("should be a supported locale", () => {
      expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
    });

    it('should equal "ar" by default', () => {
      expect(DEFAULT_LOCALE).toBe("ar");
    });
  });

  describe("SUPPORTED_LOCALES", () => {
    it("should contain exactly the expected locales in order", () => {
      expect(SUPPORTED_LOCALES).toEqual(["en", "ar"]);
    });

    it("should not contain duplicates", () => {
      const set = new Set(SUPPORTED_LOCALES);
      expect(set.size).toBe(SUPPORTED_LOCALES.length);
    });

    it("each supported locale should have corresponding metadata", () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(LOCALE_META).toHaveProperty(locale);
      }
    });
  });

  describe("LOCALE_META", () => {
    const isDir = (v: unknown): v is "ltr" | "rtl" =>
      v === "ltr" || v === "rtl";
    const isFlag = (v: unknown): v is "gb" | "sa" => v === "gb" || v === "sa";

    const expectValidMeta = (locale: Locale) => {
      const meta = LOCALE_META[locale];
      expect(meta).toBeTruthy();
      expect(typeof meta.iso).toBe("string");
      expect(meta.iso.length).toBeGreaterThan(0);
      expect(typeof meta.nativeName).toBe("string");
      expect(meta.nativeName.length).toBeGreaterThan(0);
      expect(typeof meta.countryName).toBe("string");
      expect(meta.countryName.length).toBeGreaterThan(0);
      expect(isDir(meta.dir)).toBe(true);
      expect(isFlag(meta.flag)).toBe(true);
    };

    it("should have metadata for every supported locale and only those", () => {
      // keys in LOCALE_META should match SUPPORTED_LOCALES exactly (as sets)
      const metaKeys = Object.keys(LOCALE_META).sort();
      const supportedSorted = [...SUPPORTED_LOCALES].sort();
      expect(metaKeys).toEqual(supportedSorted);
    });

    it('should have valid metadata shape for "en"', () => {
      expectValidMeta("en");
    });

    it('should have valid metadata shape for "ar"', () => {
      expectValidMeta("ar");
    });

    it('should have correct specific values for "en"', () => {
      expect(LOCALE_META.en).toMatchObject({
        iso: "EN",
        nativeName: "English",
        countryName: "United Kingdom",
        dir: "ltr",
        flag: "gb",
      });
    });

    it('should have correct specific values for "ar"', () => {
      expect(LOCALE_META.ar).toMatchObject({
        iso: "AR",
        nativeName: "العربية",
        countryName: "المملكة العربية السعودية",
        dir: "rtl",
        flag: "sa",
      });
    });

    it("round-trip: accessing metadata for each SUPPORTED_LOCALE should be defined", () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(LOCALE_META[locale]).toBeDefined();
      }
    });
  });

  describe("Type soundness at runtime (defensive checks)", () => {
    // While TypeScript ensures compile-time safety, we include a defensive runtime check
    // to catch accidental regressions in emitted JS shapes.
    it("should not include unexpected locales in LOCALE_META", () => {
      const allowed: Locale[] = SUPPORTED_LOCALES;
      const keys = Object.keys(LOCALE_META);
      for (const k of keys) {
        expect(allowed.includes(k as Locale)).toBe(true);
      }
    });
  });
});
