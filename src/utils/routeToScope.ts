// src/utils/routeToScope.ts
import { ModuleKey } from '@/src/config/modules';

export function routeToModule(pathname: string): ModuleKey {
  if (pathname.startsWith('/fm') || pathname.startsWith('/work-orders')) return 'work_orders';
  if (pathname.startsWith('/properties')) return 'properties';
  if (pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/hr')) return 'hr';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/crm')) return 'crm';
  if (pathname.startsWith('/aqar') || pathname.startsWith('/marketplace/real-estate')) return 'aqar_souq';
  if (pathname.startsWith('/souq') || pathname.startsWith('/marketplace/materials')) return 'marketplace';
  if (pathname.startsWith('/support')) return 'support';
  return 'dashboard';
}
