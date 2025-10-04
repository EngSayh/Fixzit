
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

async function loadAdminData() {
  try {
    const [categoriesResponse, statsResponse] = await Promise.all([
      serverFetchJsonWithTenant<any>('/api/marketplace/categories').catch(err => {
        console.error('Failed to fetch categories for admin:', err);
        return { data: [] };
      }),
      serverFetchJsonWithTenant<any>('/api/marketplace/admin/stats').catch(err => {
        console.error('Failed to fetch admin stats:', err);
        return { data: { totalProducts: 0, totalOrders: 0, totalRevenue: 0 } };
      })
    ]);

    const departments = ((categoriesResponse.data || []) as any[]).map(category => ({
      slug: category.slug,
      name: category.name?.en ?? category.slug
    }));

    const stats = statsResponse.data || { totalProducts: 0, totalOrders: 0, totalRevenue: 0 };

    return { departments, stats };
  } catch (error) {
    console.error('Failed to load admin page data:', error);
    return {
      departments: [],
      stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0 }
    };
  }
}

export default async function AdminPage() {
  const { departments, stats } = await loadAdminData();

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-[#0F1111]">Marketplace Admin</h1>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-[#0F1111]">Total Products</h2>
            <p className="mt-2 text-3xl font-bold text-[#0061A8]">{stats.totalProducts}</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-[#0F1111]">Total Orders</h2>
            <p className="mt-2 text-3xl font-bold text-[#00A859]">{stats.totalOrders}</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-[#0F1111]">Total Revenue</h2>
            <p className="mt-2 text-3xl font-bold text-[#FFB400]">{stats.totalRevenue} SAR</p>
          </div>
        </div>
      </main>
    </div>
  );
}

