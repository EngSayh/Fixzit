'use client';

import { useState } from 'react';
import { useI18n } from '@/src/providers/RootProviders';
import { Truck, Package, Clock, MapPin, Calendar, CheckCircle, AlertTriangle, Info } from 'lucide-react';

// Mock shipment data
const MOCK_SHIPMENTS = [
  {
    id: 'SHP-2024-001',
    orderId: 'PO-2024-0891',
    carrier: 'Aramex',
    trackingNumber: 'ARA-123456789',
    status: 'in_transit',
    origin: 'Riyadh Warehouse',
    destination: 'Site A - Jeddah',
    estimatedDelivery: '2024-12-25',
    currentLocation: 'Dammam Hub',
    progress: 65,
    items: 15
  },
  {
    id: 'SHP-2024-002',
    orderId: 'PO-2024-0890',
    carrier: 'SMSA Express',
    trackingNumber: 'SMSA-987654321',
    status: 'delivered',
    origin: 'Jeddah Supplier',
    destination: 'Main Office - Riyadh',
    estimatedDelivery: '2024-12-20',
    deliveredDate: '2024-12-19',
    currentLocation: 'Delivered',
    progress: 100,
    items: 8
  },
  {
    id: 'SHP-2024-003',
    orderId: 'PO-2024-0892',
    carrier: 'Saudi Post',
    trackingNumber: 'SPL-456789123',
    status: 'preparing',
    origin: 'Supplier Warehouse',
    destination: 'Tower B - Riyadh',
    estimatedDelivery: '2024-12-28',
    currentLocation: 'Preparing for dispatch',
    progress: 15,
    items: 25
  }
];

const STATUS_CONFIG = {
  preparing: { label: 'Preparing', color: 'bg-gray-100 text-gray-600', icon: Package },
  in_transit: { label: 'In Transit', color: 'bg-blue-100 text-blue-800', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-purple-100 text-purple-800', icon: MapPin },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  delayed: { label: 'Delayed', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
};

export default function ShippingPage() {
  const { t, language, isRTL } = useI18n();
  const [activeTab, setActiveTab] = useState<'active' | 'delivered' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter shipments based on tab
  const filteredShipments = MOCK_SHIPMENTS.filter(shipment => {
    const matchesSearch = shipment.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         shipment.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'active') return matchesSearch && shipment.status !== 'delivered';
    if (activeTab === 'delivered') return matchesSearch && shipment.status === 'delivered';
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('marketplace.shipping', 'Shipping & Logistics')}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {t('marketplace.shippingDescription', 'Track your shipments and manage deliveries')}
              </p>
            </div>
            
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Truck className="w-5 h-5" />
              {t('marketplace.schedulePickup', 'Schedule Pickup')}
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('active')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'active'
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('marketplace.activeShipments', 'Active Shipments')}
              </button>
              <button
                onClick={() => setActiveTab('delivered')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'delivered'
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('marketplace.delivered', 'Delivered')}
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('common.all', 'All Shipments')}
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Shipment Tracking */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Track */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('marketplace.quickTrack', 'Quick Track')}
          </h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder={t('marketplace.enterTracking', 'Enter tracking number...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <button className="px-6 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004d87] transition-colors">
              {t('common.track', 'Track')}
            </button>
          </div>
        </div>

        {/* Shipments List */}
        <div className="space-y-4">
          {filteredShipments.map((shipment) => {
            const StatusIcon = (STATUS_CONFIG as any)[shipment.status]?.icon || (()=>null);
            
            return (
              <div
                key={shipment.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  {/* Shipment Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {shipment.trackingNumber}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${(STATUS_CONFIG as any)[shipment.status]?.color || ''}`}>
                          <StatusIcon className="w-3 h-3" />
                          {(STATUS_CONFIG as any)[shipment.status]?.label || shipment.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {t('marketplace.order', 'Order')}: {shipment.orderId} • 
                        {t('marketplace.carrier', 'Carrier')}: {shipment.carrier}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{t('marketplace.estimatedDelivery', 'Est. Delivery')}</p>
                      <p className="font-medium text-gray-900">
                        {new Date(shipment.estimatedDelivery).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>{shipment.origin}</span>
                      <span>{shipment.destination}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#0061A8] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${shipment.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      <MapPin className="inline w-4 h-4 mr-1" />
                      {t('marketplace.currentLocation', 'Current Location')}: {shipment.currentLocation}
                    </p>
                  </div>

                  {/* Shipment Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-gray-500">{t('marketplace.items', 'Items')}</p>
                      <p className="font-medium">{shipment.items}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('marketplace.shipmentId', 'Shipment ID')}</p>
                      <p className="font-medium">{shipment.id}</p>
                    </div>
                    {shipment.deliveredDate && (
                      <div>
                        <p className="text-sm text-gray-500">{t('marketplace.deliveredOn', 'Delivered On')}</p>
                        <p className="font-medium text-green-600">
                          {new Date(shipment.deliveredDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredShipments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t('marketplace.noShipments', 'No shipments found')}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('marketplace.noShipmentsDescription', 'Your shipments will appear here once orders are dispatched.')}
            </p>
          </div>
        )}
      </div>

      {/* Logistics Partners */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('marketplace.logisticsPartners', 'Logistics Partners')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-gray-700 mb-1">Aramex</div>
              <p className="text-sm text-gray-500">{t('marketplace.express', 'Express Delivery')}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-gray-700 mb-1">SMSA</div>
              <p className="text-sm text-gray-500">{t('marketplace.nationwide', 'Nationwide Coverage')}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-gray-700 mb-1">Saudi Post</div>
              <p className="text-sm text-gray-500">{t('marketplace.economy', 'Economy Shipping')}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-gray-700 mb-1">DHL</div>
              <p className="text-sm text-gray-500">{t('marketplace.international', 'International')}</p>
            </div>
          </div>
        </div>

        {/* Shipping Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">
                {t('marketplace.shippingTips', 'Shipping Tips')}
              </h4>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>• {t('marketplace.tip1', 'Always verify delivery address before confirming orders')}</li>
                <li>• {t('marketplace.tip2', 'Track shipments regularly for timely updates')}</li>
                <li>• {t('marketplace.tip3', 'Contact carrier directly for urgent delivery issues')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
