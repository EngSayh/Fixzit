
/**
 * Test framework: Jest or Vitest (globals).
 * We rely on global describe/it/expect injected by the project's test runner.
 * No explicit imports from 'vitest' or '@jest/globals' are used to remain compatible with either setup.
 */

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('ERROR_REGISTRY utilities', () => {
  describe('getErrorInfo', () => {
    it('returns the correct error for a known code', () => {
      const result = getErrorInfo('FIN-API-PAY-001');
      expect(result).toBeDefined();
      expect(result.code).toBe('FIN-API-PAY-001');
      expect(result.module).toBe('FIN');
      expect(result.submodule).toBe('Payment');
      expect(result.severity).toBe('P1');
      expect(result.userFacing).toBe(true);
      expect(result.title_en).toBe('Payment processing failed');
      expect(result.title_ar).toBe('فشل في معالجة الدفع');
      expect(result.category).toBe('Payment');
      expect(result.autoTicket).toBe(true);
    });

    it('falls back to UI-UI-UNKNOWN-000 for unknown codes', () => {
      const result = getErrorInfo('UNKNOWN-CODE-999');
      expect(result.code).toBe('UI-UI-UNKNOWN-000');
      expect(result.module).toBe('UI');
      expect(result.submodule).toBe('Unknown');
      expect(result.category).toBe('Unknown');
      expect(result.userFacing).toBe(true);
      expect(result.severity).toBe('P2');
    });

    it('handles null/undefined gracefully by returning the fallback', () => {
      expect(getErrorInfo(null as any).code).toBe('UI-UI-UNKNOWN-000');
      expect(getErrorInfo(undefined as any).code).toBe('UI-UI-UNKNOWN-000');
    });

    it('returns itself for every defined code in ERROR_REGISTRY', () => {
      const allCodes = Object.keys(ERROR_REGISTRY);
      for (const code of allCodes) {
        const item = getErrorInfo(code);
        expect(item).toBeDefined();
        expect(item.code).toBe(code);
      }
    });

    it('marks SYS-API-DB-003 as not userFacing', () => {
      const item = getErrorInfo('SYS-API-DB-003');
      expect(item.userFacing).toBe(false);
      expect(item.severity).toBe('P0');
    });
  });

  describe('getErrorsByModule', () => {
    it('returns all errors for module FIN', () => {
      const list = getErrorsByModule('FIN');
      const codes = list.map(x => x.code).sort();
      expect(list.every(x => x.module === 'FIN')).toBe(true);
      expect(codes).toEqual(['FIN-API-INV-002', 'FIN-API-PAY-001', 'FIN-UI-BAL-003'].sort());
    });

    it('returns empty array for a non-existent module', () => {
      const list = getErrorsByModule('XYZ');
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(0);
    });

    it('is case-sensitive (lowercase module yields no results)', () => {
      expect(getErrorsByModule('fin').length).toBe(0);
    });

    it('handles null/undefined inputs gracefully', () => {
      expect(getErrorsByModule(null as any).length).toBe(0);
      expect(getErrorsByModule(undefined as any).length).toBe(0);
    });
  });

  describe('getErrorsBySeverity', () => {
    it('returns all P0 errors', () => {
      const list = getErrorsBySeverity('P0');
      expect(list.map(x => x.code)).toEqual(['SYS-API-DB-003']);
      expect(list.every(x => x.severity === 'P0')).toBe(true);
    });

    it('returns P1 errors including representative codes', () => {
      const list = getErrorsBySeverity('P1');
      const codes = list.map(x => x.code);
      expect(list.length).toBe(6);
      expect(codes).toEqual(expect.arrayContaining([
        'WO-UI-LOAD-003',
        'FIN-API-PAY-001',
        'MKT-API-ORD-001',
        'AUTH-API-LOGIN-001',
        'AUTH-API-SESSION-002',
        'SYS-UI-RENDER-001'
      ]));
      expect(list.every(x => x.severity === 'P1')).toBe(true);
    });

    it('returns P2 errors and includes the generic fallback', () => {
      const list = getErrorsBySeverity('P2');
      const codes = list.map(x => x.code);
      expect(list.length).toBe(9);
      expect(codes).toEqual(expect.arrayContaining([
        'WO-API-VAL-001',
        'WO-API-SAVE-002',
        'FIN-API-INV-002',
        'FIN-UI-BAL-003',
        'PROP-API-LIST-001',
        'PROP-API-SAVE-002',
        'MKT-UI-CAT-002',
        'SYS-API-NET-002',
        'UI-UI-UNKNOWN-000'
      ]));
      expect(list.every(x => x.severity === 'P2')).toBe(true);
    });

    it('returns empty array for severities with no items (P3)', () => {
      const list = getErrorsBySeverity('P3');
      expect(list.length).toBe(0);
    });

    it('handles invalid severity input gracefully', () => {
      const list = getErrorsBySeverity('P9' as any);
      expect(list.length).toBe(0);
    });
  });

  describe('getAutoTicketErrors', () => {
    it('returns only errors with autoTicket = true', () => {
      const list = getAutoTicketErrors();
      expect(list.length).toBe(13);
      expect(list.every(x => x.autoTicket)).toBe(true);
      expect(list.map(x => x.code)).toEqual(expect.arrayContaining([
        'WO-API-VAL-001',
        'WO-API-SAVE-002',
        'WO-UI-LOAD-003',
        'FIN-API-PAY-001',
        'FIN-API-INV-002',
        'PROP-API-LIST-001',
        'PROP-API-SAVE-002',
        'MKT-API-ORD-001',
        'MKT-UI-CAT-002',
        'SYS-UI-RENDER-001',
        'SYS-API-NET-002',
        'SYS-API-DB-003',
        'UI-UI-UNKNOWN-000'
      ]));
    });
  });
});