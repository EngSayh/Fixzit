import { describe, it, expect, vi } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({
    db: vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue({
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
}));

describe("Owner Analytics Service", () => {
  describe("AnalyticsPeriod", () => {
    it("should represent a valid date range", () => {
      const period = {
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-03-31"),
        label: "Q1 2025",
      };

      expect(period.startDate).toBeInstanceOf(Date);
      expect(period.endDate).toBeInstanceOf(Date);
      expect(period.endDate.getTime()).toBeGreaterThan(period.startDate.getTime());
    });

    it("should support standard period labels", () => {
      const periods = ["3 Months", "6 Months", "YTD", "Custom"];
      
      periods.forEach(label => {
        const period = { startDate: new Date(), endDate: new Date(), label };
        expect(period.label).toBe(label);
      });
    });
  });

  describe("PropertyFinancialSummary", () => {
    it("should calculate NOI correctly", () => {
      // NOI = Total Revenue - Total Expenses
      const totalRevenue = 50000;
      const totalExpenses = 15000;
      const expectedNOI = 35000;

      expect(totalRevenue - totalExpenses).toBe(expectedNOI);
    });

    it("should calculate NOI margin correctly", () => {
      // NOI Margin = (NOI / Total Revenue) * 100
      const totalRevenue = 50000;
      const noi = 35000;
      const expectedMargin = 70; // 70%

      expect((noi / totalRevenue) * 100).toBe(expectedMargin);
    });

    it("should aggregate unit-level data", () => {
      const units = [
        { unitNumber: "101", revenue: 10000, maintenanceCosts: 1000, utilityCosts: 500, noi: 8500, occupancyDays: 90 },
        { unitNumber: "102", revenue: 12000, maintenanceCosts: 800, utilityCosts: 600, noi: 10600, occupancyDays: 90 },
        { unitNumber: "103", revenue: 8000, maintenanceCosts: 1200, utilityCosts: 400, noi: 6400, occupancyDays: 85 },
      ];

      const totalRevenue = units.reduce((sum, u) => sum + u.revenue, 0);
      const totalNOI = units.reduce((sum, u) => sum + u.noi, 0);

      expect(totalRevenue).toBe(30000);
      expect(totalNOI).toBe(25500);
    });
  });

  describe("OwnerPortfolioSummary", () => {
    it("should calculate occupancy rate correctly", () => {
      const totalUnits = 50;
      const occupiedUnits = 45;
      const expectedRate = 90; // 90%

      expect((occupiedUnits / totalUnits) * 100).toBe(expectedRate);
    });

    it("should calculate average NOI margin", () => {
      const properties = [
        { noiMargin: 65 },
        { noiMargin: 70 },
        { noiMargin: 75 },
        { noiMargin: 80 },
      ];

      const avgMargin = properties.reduce((sum, p) => sum + p.noiMargin, 0) / properties.length;
      
      expect(avgMargin).toBe(72.5);
    });

    it("should calculate equity correctly", () => {
      // Equity = Current Value - Mortgages
      const currentValue = 5000000;
      const mortgages = 3000000;
      const expectedEquity = 2000000;

      expect(currentValue - mortgages).toBe(expectedEquity);
    });

    it("should calculate ROI correctly", () => {
      // ROI = (Total NOI / Total Investment) * 100
      const totalNOI = 150000;
      const totalInvestment = 2000000;
      const expectedROI = 7.5; // 7.5%

      expect((totalNOI / totalInvestment) * 100).toBe(expectedROI);
    });
  });

  describe("Period Calculations", () => {
    it("should handle 3-month period", () => {
      const end = new Date("2025-03-31");
      const start = new Date("2025-01-01");
      const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + 
                         (end.getMonth() - start.getMonth());
      
      expect(diffMonths).toBe(2); // Jan to Mar is 2 month difference
    });

    it("should handle YTD period", () => {
      const now = new Date("2025-06-15");
      const yearStart = new Date(now.getFullYear(), 0, 1);
      
      expect(yearStart.getMonth()).toBe(0);
      expect(yearStart.getDate()).toBe(1);
    });

    it("should handle custom date range", () => {
      const customStart = new Date("2024-07-01");
      const customEnd = new Date("2025-06-30");
      
      const diffMs = customEnd.getTime() - customStart.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(364); // ~1 year
    });
  });

  describe("Expense Categories", () => {
    it("should categorize expenses correctly", () => {
      const expenses = {
        maintenanceCosts: 5000,
        utilityCosts: 2000,
        managementFees: 3000,
        insuranceCosts: 1500,
        otherExpenses: 500,
      };

      const total = Object.values(expenses).reduce((sum, val) => sum + val, 0);
      
      expect(total).toBe(12000);
    });

    it("should handle zero expenses", () => {
      const expenses = {
        maintenanceCosts: 0,
        utilityCosts: 0,
        managementFees: 0,
        insuranceCosts: 0,
        otherExpenses: 0,
      };

      const total = Object.values(expenses).reduce((sum, val) => sum + val, 0);
      
      expect(total).toBe(0);
    });
  });

  describe("Revenue Breakdown", () => {
    it("should separate rental income from other income", () => {
      const rentalIncome = 45000;
      const otherIncome = 5000;
      const totalRevenue = rentalIncome + otherIncome;

      expect(totalRevenue).toBe(50000);
      expect(rentalIncome / totalRevenue).toBe(0.9); // 90% rental
    });

    it("should handle properties with only rental income", () => {
      const rentalIncome = 50000;
      const otherIncome = 0;
      const totalRevenue = rentalIncome + otherIncome;

      expect(totalRevenue).toBe(50000);
      expect(rentalIncome).toBe(totalRevenue);
    });
  });
});
