'use client';

import { useAutoTranslator } from '@/i18n/useAutoTranslator';

export default function VendorsPage() {
  const auto = useAutoTranslator('souq.vendors');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Vendors', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Manage approved suppliers and vendors', 'header.subtitle')}
          </p>
        </div>
        <button className="px-4 py-2 bg-success text-white rounded-2xl hover:bg-success/90 transition-colors">
          {auto('Add Vendor', 'actions.add')}
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {auto('Vendor Name', 'table.vendor')}
                </th>
                <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {auto('Category', 'table.category')}
                </th>
                <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {auto('Rating', 'table.rating')}
                </th>
                <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {auto('Status', 'table.status')}
                </th>
                <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {auto('Actions', 'table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground">Al-Rashid Steel Co.</div>
                  <div className="text-sm text-muted-foreground">
                    {auto('Since {{year}}', 'table.since').replace('{{year}}', '2018')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {auto('Construction Materials', 'table.categories.construction')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-foreground">4.8</span>
                    <span className="ms-1 text-accent">★</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success/10 text-success">
                    {auto('Active', 'status.active')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-primary hover:text-primary">
                    {auto('View', 'actions.view')}
                  </button>
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground">Saudi Electric Supply</div>
                  <div className="text-sm text-muted-foreground">
                    {auto('Since {{year}}', 'table.since').replace('{{year}}', '2020')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {auto('Electrical Equipment', 'table.categories.electrical')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-foreground">4.5</span>
                    <span className="ms-1 text-accent">★</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success/10 text-success">
                    {auto('Active', 'status.active')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-primary hover:text-primary">
                    {auto('View', 'actions.view')}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
