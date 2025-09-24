import { redirect } from 'next/navigation';

export default function AqarPropertiesPage() {
  // توحيد المسار: تحويل صفحة Aqar properties إلى سوق العقارات الموحد
  redirect('/marketplace/properties');
}

