import type { EmployeeDoc } from '@/server/models/Employee';
import { toUiEmployeeStatus, toDbEmployeeStatus, type EmployeeStatusDB } from './employeeStatus';

export function toUIEmployee(doc: EmployeeDoc) {
  const obj = (typeof doc.toObject === 'function') ? doc.toObject() : doc;
  return { ...obj, status: toUiEmployeeStatus(obj.status) };
}

export function normalizeEmployeeInput<T extends { status?: unknown }>(p: T) {
  if (p && Object.prototype.hasOwnProperty.call(p, 'status')) {
    return { ...p, status: toDbEmployeeStatus(p.status) } as T & { status?: EmployeeStatusDB };
  }
  return p;
}


