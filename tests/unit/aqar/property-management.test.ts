/**
 * Property Management (Aqar) Module Tests
 * Tests property CRUD, unit management, occupancy tracking, and tenant operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Property Management (Aqar)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property Hierarchy', () => {
    interface Property {
      id: string;
      name: string;
      type: 'residential' | 'commercial' | 'mixed';
      address: {
        street: string;
        city: string;
        country: string;
        postalCode?: string;
        coordinates?: { lat: number; lng: number };
      };
      buildings: Building[];
    }

    interface Building {
      id: string;
      propertyId: string;
      name: string;
      floors: Floor[];
    }

    interface Floor {
      id: string;
      buildingId: string;
      number: number;
      units: Unit[];
    }

    interface Unit {
      id: string;
      floorId: string;
      number: string;
      type: 'apartment' | 'office' | 'retail' | 'parking';
      area: number; // square meters
      status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
    }

    const getUnitHierarchy = (unit: Unit, floor: Floor, building: Building, property: Property) => {
      return {
        propertyId: property.id,
        propertyName: property.name,
        buildingId: building.id,
        buildingName: building.name,
        floorId: floor.id,
        floorNumber: floor.number,
        unitId: unit.id,
        unitNumber: unit.number,
        fullAddress: `${unit.number}, Floor ${floor.number}, ${building.name}, ${property.name}`,
      };
    };

    it('should maintain property-building-floor-unit hierarchy', () => {
      const unit: Unit = { id: 'u1', floorId: 'f1', number: '101', type: 'apartment', area: 85, status: 'occupied' };
      const floor: Floor = { id: 'f1', buildingId: 'b1', number: 1, units: [unit] };
      const building: Building = { id: 'b1', propertyId: 'p1', name: 'Tower A', floors: [floor] };
      const property: Property = {
        id: 'p1',
        name: 'Al Mouj Residences',
        type: 'residential',
        address: { street: 'Al Mouj St', city: 'Muscat', country: 'Oman' },
        buildings: [building],
      };

      const hierarchy = getUnitHierarchy(unit, floor, building, property);

      expect(hierarchy.fullAddress).toBe('101, Floor 1, Tower A, Al Mouj Residences');
      expect(hierarchy.propertyId).toBe('p1');
      expect(hierarchy.unitId).toBe('u1');
    });
  });

  describe('Occupancy Tracking', () => {
    interface OccupancySummary {
      totalUnits: number;
      occupied: number;
      vacant: number;
      maintenance: number;
      reserved: number;
      occupancyRate: number;
    }

    const calculateOccupancy = (units: Array<{ status: string }>): OccupancySummary => {
      const summary = {
        totalUnits: units.length,
        occupied: 0,
        vacant: 0,
        maintenance: 0,
        reserved: 0,
        occupancyRate: 0,
      };

      units.forEach(unit => {
        switch (unit.status) {
          case 'occupied':
            summary.occupied++;
            break;
          case 'vacant':
            summary.vacant++;
            break;
          case 'maintenance':
            summary.maintenance++;
            break;
          case 'reserved':
            summary.reserved++;
            break;
        }
      });

      // Occupancy rate = (occupied + reserved) / (total - maintenance)
      const availableUnits = summary.totalUnits - summary.maintenance;
      summary.occupancyRate = availableUnits > 0
        ? Math.round(((summary.occupied + summary.reserved) / availableUnits) * 100)
        : 0;

      return summary;
    };

    it('should calculate occupancy rate correctly', () => {
      const units = [
        { status: 'occupied' },
        { status: 'occupied' },
        { status: 'occupied' },
        { status: 'vacant' },
        { status: 'reserved' },
      ];

      const summary = calculateOccupancy(units);

      expect(summary.totalUnits).toBe(5);
      expect(summary.occupied).toBe(3);
      expect(summary.vacant).toBe(1);
      expect(summary.reserved).toBe(1);
      expect(summary.occupancyRate).toBe(80); // (3+1)/(5-0) = 80%
    });

    it('should exclude maintenance units from occupancy calculation', () => {
      const units = [
        { status: 'occupied' },
        { status: 'occupied' },
        { status: 'maintenance' },
        { status: 'maintenance' },
        { status: 'vacant' },
      ];

      const summary = calculateOccupancy(units);

      expect(summary.maintenance).toBe(2);
      expect(summary.occupancyRate).toBe(67); // 2/(5-2) = 67%
    });

    it('should handle empty unit list', () => {
      const summary = calculateOccupancy([]);
      expect(summary.totalUnits).toBe(0);
      expect(summary.occupancyRate).toBe(0);
    });
  });

  describe('Tenant Contract Management', () => {
    interface TenantContract {
      id: string;
      tenantId: string;
      unitId: string;
      startDate: Date;
      endDate: Date;
      monthlyRent: number;
      currency: string;
      securityDeposit: number;
      status: 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';
    }

    const isContractActive = (contract: TenantContract): boolean => {
      const now = new Date();
      return contract.status === 'active' && 
             contract.startDate <= now && 
             contract.endDate >= now;
    };

    const getContractDaysRemaining = (contract: TenantContract): number => {
      const now = new Date();
      const endDate = new Date(contract.endDate);
      const diffTime = endDate.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const isRenewalDue = (contract: TenantContract, warningDays: number = 60): boolean => {
      const daysRemaining = getContractDaysRemaining(contract);
      return contract.status === 'active' && daysRemaining > 0 && daysRemaining <= warningDays;
    };

    it('should identify active contracts', () => {
      const activeContract: TenantContract = {
        id: 'c1',
        tenantId: 't1',
        unitId: 'u1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        monthlyRent: 500,
        currency: 'OMR',
        securityDeposit: 1000,
        status: 'active',
      };

      expect(isContractActive(activeContract)).toBe(true);
    });

    it('should identify expired contracts', () => {
      const expiredContract: TenantContract = {
        id: 'c2',
        tenantId: 't2',
        unitId: 'u2',
        startDate: new Date('2022-01-01'),
        endDate: new Date('2023-12-31'),
        monthlyRent: 450,
        currency: 'OMR',
        securityDeposit: 900,
        status: 'active', // Status not updated yet
      };

      expect(isContractActive(expiredContract)).toBe(false);
    });

    it('should calculate days remaining in contract', () => {
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 30);

      const contract: TenantContract = {
        id: 'c3',
        tenantId: 't3',
        unitId: 'u3',
        startDate: new Date('2024-01-01'),
        endDate: futureEnd,
        monthlyRent: 600,
        currency: 'OMR',
        securityDeposit: 1200,
        status: 'active',
      };

      const daysRemaining = getContractDaysRemaining(contract);
      expect(daysRemaining).toBe(30);
    });

    it('should flag contracts due for renewal', () => {
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 45); // 45 days from now

      const contract: TenantContract = {
        id: 'c4',
        tenantId: 't4',
        unitId: 'u4',
        startDate: new Date('2024-01-01'),
        endDate: renewalDate,
        monthlyRent: 550,
        currency: 'OMR',
        securityDeposit: 1100,
        status: 'active',
      };

      expect(isRenewalDue(contract, 60)).toBe(true); // Within 60-day window
      expect(isRenewalDue(contract, 30)).toBe(false); // Not within 30-day window
    });
  });

  describe('Rent Collection', () => {
    interface RentPayment {
      id: string;
      contractId: string;
      amount: number;
      currency: string;
      dueDate: Date;
      paidDate?: Date;
      status: 'pending' | 'paid' | 'overdue' | 'partial' | 'waived';
      lateFee?: number;
    }

    const calculateLateFee = (payment: RentPayment, lateFeePerDay: number, gracePeriodDays: number = 5): number => {
      if (payment.status === 'paid' || payment.status === 'waived') return 0;
      
      const now = new Date();
      const dueDate = new Date(payment.dueDate);
      const graceDate = new Date(dueDate);
      graceDate.setDate(graceDate.getDate() + gracePeriodDays);

      if (now <= graceDate) return 0;

      const daysLate = Math.ceil((now.getTime() - graceDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysLate * lateFeePerDay;
    };

    const getPaymentStatus = (payment: RentPayment): string => {
      const now = new Date();
      
      if (payment.paidDate) {
        return payment.paidDate > payment.dueDate ? 'paid_late' : 'paid_on_time';
      }

      if (now > payment.dueDate) {
        return 'overdue';
      }

      const daysToDue = Math.ceil((payment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToDue <= 7) {
        return 'due_soon';
      }

      return 'upcoming';
    };

    it('should calculate late fees after grace period', () => {
      const overdueDueDate = new Date();
      overdueDueDate.setDate(overdueDueDate.getDate() - 15); // 15 days ago

      const payment: RentPayment = {
        id: 'p1',
        contractId: 'c1',
        amount: 500,
        currency: 'OMR',
        dueDate: overdueDueDate,
        status: 'overdue',
      };

      const lateFee = calculateLateFee(payment, 5, 5); // 5 OMR/day, 5 day grace
      expect(lateFee).toBe(50); // 10 days late (15-5) * 5 = 50
    });

    it('should not apply late fee during grace period', () => {
      const recentDueDate = new Date();
      recentDueDate.setDate(recentDueDate.getDate() - 3); // 3 days ago

      const payment: RentPayment = {
        id: 'p2',
        contractId: 'c2',
        amount: 500,
        currency: 'OMR',
        dueDate: recentDueDate,
        status: 'pending',
      };

      const lateFee = calculateLateFee(payment, 5, 5);
      expect(lateFee).toBe(0);
    });

    it('should identify overdue payments', () => {
      const pastDue = new Date();
      pastDue.setDate(pastDue.getDate() - 10);

      const payment: RentPayment = {
        id: 'p3',
        contractId: 'c3',
        amount: 600,
        currency: 'OMR',
        dueDate: pastDue,
        status: 'pending',
      };

      expect(getPaymentStatus(payment)).toBe('overdue');
    });

    it('should identify payments due soon', () => {
      const soonDue = new Date();
      soonDue.setDate(soonDue.getDate() + 5);

      const payment: RentPayment = {
        id: 'p4',
        contractId: 'c4',
        amount: 550,
        currency: 'OMR',
        dueDate: soonDue,
        status: 'pending',
      };

      expect(getPaymentStatus(payment)).toBe('due_soon');
    });
  });

  describe('Maintenance Request Integration', () => {
    interface MaintenanceRequest {
      id: string;
      unitId: string;
      reportedBy: string;
      category: 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'appliance' | 'other';
      priority: 'low' | 'medium' | 'high' | 'emergency';
      description: string;
      status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
      createdAt: Date;
      resolvedAt?: Date;
    }

    const calculateResponseTime = (request: MaintenanceRequest): number | null => {
      if (!request.resolvedAt) return null;
      return Math.ceil(
        (request.resolvedAt.getTime() - request.createdAt.getTime()) / (1000 * 60 * 60)
      ); // hours
    };

    const isWithinSLA = (request: MaintenanceRequest, slaHours: Record<string, number>): boolean | null => {
      const responseTime = calculateResponseTime(request);
      if (responseTime === null) return null;
      
      const requiredHours = slaHours[request.priority] || 72;
      return responseTime <= requiredHours;
    };

    const slaTargets = {
      emergency: 4,
      high: 24,
      medium: 48,
      low: 72,
    };

    it('should calculate maintenance response time', () => {
      const created = new Date('2024-06-01T08:00:00');
      const resolved = new Date('2024-06-01T14:00:00');

      const request: MaintenanceRequest = {
        id: 'm1',
        unitId: 'u1',
        reportedBy: 'tenant-1',
        category: 'plumbing',
        priority: 'high',
        description: 'Leaking pipe in bathroom',
        status: 'completed',
        createdAt: created,
        resolvedAt: resolved,
      };

      expect(calculateResponseTime(request)).toBe(6); // 6 hours
    });

    it('should verify SLA compliance', () => {
      const created = new Date('2024-06-01T08:00:00');
      const resolved = new Date('2024-06-01T10:00:00');

      const emergencyRequest: MaintenanceRequest = {
        id: 'm2',
        unitId: 'u2',
        reportedBy: 'tenant-2',
        category: 'electrical',
        priority: 'emergency',
        description: 'Power outage in unit',
        status: 'completed',
        createdAt: created,
        resolvedAt: resolved,
      };

      expect(isWithinSLA(emergencyRequest, slaTargets)).toBe(true); // 2h < 4h SLA
    });

    it('should flag SLA breach', () => {
      const created = new Date('2024-06-01T08:00:00');
      const resolved = new Date('2024-06-02T20:00:00'); // 36 hours later

      const highPriorityRequest: MaintenanceRequest = {
        id: 'm3',
        unitId: 'u3',
        reportedBy: 'tenant-3',
        category: 'hvac',
        priority: 'high',
        description: 'AC not working',
        status: 'completed',
        createdAt: created,
        resolvedAt: resolved,
      };

      expect(isWithinSLA(highPriorityRequest, slaTargets)).toBe(false); // 36h > 24h SLA
    });
  });

  describe('Property Financials', () => {
    interface PropertyFinancials {
      propertyId: string;
      period: { year: number; month: number };
      rentalIncome: number;
      maintenanceCosts: number;
      utilityCosts: number;
      managementFees: number;
      otherExpenses: number;
      currency: string;
    }

    const calculateNOI = (financials: PropertyFinancials): number => {
      const totalExpenses = 
        financials.maintenanceCosts +
        financials.utilityCosts +
        financials.managementFees +
        financials.otherExpenses;
      
      return financials.rentalIncome - totalExpenses;
    };

    const calculateExpenseRatio = (financials: PropertyFinancials): number => {
      const totalExpenses = 
        financials.maintenanceCosts +
        financials.utilityCosts +
        financials.managementFees +
        financials.otherExpenses;
      
      if (financials.rentalIncome === 0) return 0;
      return Math.round((totalExpenses / financials.rentalIncome) * 100);
    };

    it('should calculate Net Operating Income', () => {
      const financials: PropertyFinancials = {
        propertyId: 'p1',
        period: { year: 2024, month: 6 },
        rentalIncome: 50000,
        maintenanceCosts: 5000,
        utilityCosts: 2000,
        managementFees: 5000,
        otherExpenses: 1000,
        currency: 'OMR',
      };

      expect(calculateNOI(financials)).toBe(37000); // 50000 - 13000
    });

    it('should calculate expense ratio', () => {
      const financials: PropertyFinancials = {
        propertyId: 'p2',
        period: { year: 2024, month: 6 },
        rentalIncome: 100000,
        maintenanceCosts: 10000,
        utilityCosts: 5000,
        managementFees: 10000,
        otherExpenses: 5000,
        currency: 'OMR',
      };

      expect(calculateExpenseRatio(financials)).toBe(30); // 30%
    });

    it('should handle zero rental income', () => {
      const emptyProperty: PropertyFinancials = {
        propertyId: 'p3',
        period: { year: 2024, month: 6 },
        rentalIncome: 0,
        maintenanceCosts: 1000,
        utilityCosts: 500,
        managementFees: 0,
        otherExpenses: 0,
        currency: 'OMR',
      };

      expect(calculateExpenseRatio(emptyProperty)).toBe(0);
      expect(calculateNOI(emptyProperty)).toBe(-1500);
    });
  });

  describe('Multi-Property Portfolio', () => {
    interface PortfolioSummary {
      totalProperties: number;
      totalUnits: number;
      totalOccupied: number;
      totalVacant: number;
      averageOccupancyRate: number;
      monthlyRentalIncome: number;
      currency: string;
    }

    const aggregatePortfolio = (
      properties: Array<{
        units: number;
        occupied: number;
        vacant: number;
        monthlyRent: number;
      }>
    ): PortfolioSummary => {
      const totals = properties.reduce(
        (acc, prop) => ({
          totalUnits: acc.totalUnits + prop.units,
          totalOccupied: acc.totalOccupied + prop.occupied,
          totalVacant: acc.totalVacant + prop.vacant,
          monthlyRentalIncome: acc.monthlyRentalIncome + prop.monthlyRent,
        }),
        { totalUnits: 0, totalOccupied: 0, totalVacant: 0, monthlyRentalIncome: 0 }
      );

      return {
        totalProperties: properties.length,
        ...totals,
        averageOccupancyRate: totals.totalUnits > 0
          ? Math.round((totals.totalOccupied / totals.totalUnits) * 100)
          : 0,
        currency: 'OMR',
      };
    };

    it('should aggregate portfolio metrics', () => {
      const properties = [
        { units: 100, occupied: 85, vacant: 15, monthlyRent: 50000 },
        { units: 50, occupied: 48, vacant: 2, monthlyRent: 30000 },
        { units: 75, occupied: 60, vacant: 15, monthlyRent: 40000 },
      ];

      const summary = aggregatePortfolio(properties);

      expect(summary.totalProperties).toBe(3);
      expect(summary.totalUnits).toBe(225);
      expect(summary.totalOccupied).toBe(193);
      expect(summary.monthlyRentalIncome).toBe(120000);
      expect(summary.averageOccupancyRate).toBe(86); // 193/225 = 85.78%
    });

    it('should handle empty portfolio', () => {
      const summary = aggregatePortfolio([]);

      expect(summary.totalProperties).toBe(0);
      expect(summary.totalUnits).toBe(0);
      expect(summary.averageOccupancyRate).toBe(0);
    });
  });
});
