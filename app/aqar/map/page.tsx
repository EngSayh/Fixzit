'use client';

export default function MapPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interactive Property Map</h1>
          <p className="text-gray-600">Explore properties on the map</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
            Filters
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Search Area
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="h-96 bg-gray-100 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-lg font-medium">Interactive Map View</p>
            <p className="text-sm mt-2">Property locations will be displayed here</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <h3 className="font-medium text-gray-900">Properties in View</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">42</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <h3 className="font-medium text-gray-900">Average Price</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">SAR 850K</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <h3 className="font-medium text-gray-900">New Listings</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">8</p>
        </div>
      </div>
    </div>
  );
}

