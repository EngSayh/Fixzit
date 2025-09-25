export type EmployeeStatusDB = 'ACTIVE'|'INACTIVE'|'ON_LEAVE';
export type EmployeeStatusUI = 'Active'|'Inactive'|'On Leave';

const UI_TO_DB: Record<string, EmployeeStatusDB> = {
  'active': 'ACTIVE',
  'inactive': 'INACTIVE',
  'on leave': 'ON_LEAVE',
  'on_leave': 'ON_LEAVE',
  'on-leave': 'ON_LEAVE'
};

const DB_TO_UI: Record<EmployeeStatusDB, EmployeeStatusUI> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ON_LEAVE: 'On Leave'
};

export function toDbEmployeeStatus(input: unknown): EmployeeStatusDB {
  const s = String(input || '').trim().toLowerCase();
  return UI_TO_DB[s] ?? 'ACTIVE';
}

export function toUiEmployeeStatus(db: unknown): EmployeeStatusUI {
  const key = String(db || '').toUpperCase().replace(/\s+/g, '_') as EmployeeStatusDB;
  return DB_TO_UI[key] ?? 'Active';
}

