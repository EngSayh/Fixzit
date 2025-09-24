// src/utils/routeToScope.ts
import { ModuleId } from '@/src/config/dynamic-modules';

export function routeToModule(pathname: string): ModuleId {
  if (pathname.startsWith('/work-orders')) return 'work-orders';
  if (pathname.startsWith('/properties')) return 'properties';
  if (pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/hr')) return 'hr';
  if (pathname.startsWith('/administration') || pathname.startsWith('/admin')) return 'administration';
  if (pathname.startsWith('/crm')) return 'crm';
  if (pathname.startsWith('/aqar') || pathname.startsWith('/marketplace/real-estate')) return 'marketplace-real-estate';
  if (pathname.startsWith('/souq') || pathname.startsWith('/marketplace/materials') || pathname.startsWith('/marketplace')) return 'marketplace-materials';
  if (pathname.startsWith('/support')) return 'support';
  if (pathname.startsWith('/compliance')) return 'compliance';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/system')) return 'system';
  
  // FM routes
  if (pathname.startsWith('/fm')) {
    const segment = pathname.split('/')[2];
    switch(segment) {
      case 'work-orders': return 'work-orders';
      case 'properties': return 'properties';
      case 'finance': return 'finance';
      case 'hr': return 'hr';
      case 'crm': return 'crm';
      case 'marketplace': return 'marketplace-materials';
      case 'support': return 'support';
      case 'compliance': return 'compliance';
      case 'reports': return 'reports';
      case 'system': return 'system';
      default: return 'work-orders';
    }
  }
  
  return 'home';
}