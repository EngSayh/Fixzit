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
  const normalized = String(input ?? '').trim().toLowerCase();
  if (!normalized) {
    return 'ACTIVE';
  }
  const mapped = UI_TO_DB[normalized];
  if (!mapped) {
    throw new Error(`Unsupported employee status: ${input}`);
  }
  return mapped;
}

export function toUiEmployeeStatus(db: unknown): EmployeeStatusUI {
  const key = String(db ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  if (!key) {
    return 'Active';
  }
  if (key in DB_TO_UI) {
    return DB_TO_UI[key as EmployeeStatusDB];
  }
  throw new Error(`Unsupported employee status: ${db}`);
}

