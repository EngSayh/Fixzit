// app/marketplace/properties/[id]/page.tsx - Public property detail with login prompts
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Bed, Bath, Square, Heart, Eye, Shield, Phone, Mail, Calendar, MessageSquare, Share2 } from 'lucide-react';

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState('');

  // Mock property data - replace with API call
  const property = {
    id: params.id,
    title: 'Modern Apartment in Riyadh',
    city: 'Riyadh',
    district: 'Al Olaya',
    price: 85000,
    currency: 'SAR',
    bedrooms: 2,
    bathrooms: 2,
    area: 120,
    type: 'Apartment',
    verified: true,
    image: '/placeholder-property.jpg',
    images: ['/placeholder-property.jpg', '/placeholder-property-2.jpg', '/placeholder-property-3.jpg'],
    features: ['Parking', 'Gym', 'Security', 'Balcony', 'Air Conditioning'],
    description: 'Beautiful modern apartment in the heart of Riyadh with excellent amenities. Located in the prestigious Al Olaya district, this apartment offers stunning city views and is within walking distance to major shopping centers and business districts.',
    specifications: {
      'Property Type': 'Apartment',
      'Bedrooms': '2',
      'Bathrooms': '2',
      'Area': '120 m²',
      'Floor': '5th',
      'Parking': '1 space',
      'Year Built': '2020',
      'Furnished': 'No'
    },
    location: {
      address: 'Al Olaya District, Riyadh',
      coordinates: { lat: 24.7136, lng: 46.6753 }
    },
    agent: {
      name: 'Ahmed Al-Rashid',
      phone: '+966 50 123 4567',
      email: 'ahmed@fixzit.co',
      verified: true,
      license: 'FAL-123456'
    },
    neighborhood: {
      schools: ['Al-Riyadh International School', 'King Saud University'],
      hospitals: ['King Faisal Specialist Hospital', 'Riyadh Care Hospital'],
      shopping: ['Kingdom Centre', 'Al Nakheel Mall'],
      transport: ['Metro Station (5 min)', 'Airport (20 min)']
    }
  };

  const handleAction = (action: string) => {
    setAuthAction(action);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Property Images */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <img
                src={property.image}
                alt={property.title}
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>
            <div className="space-y-4">
              {property.images.slice(1, 3).map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${property.title} ${index + 2}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
                {property.verified && (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Verified
                  </div>
                )}
              </div>
              <div className="flex items-center text-gray-600 mb-4">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{property.city}, {property.district}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-4xl font-bold text-[#0061A8]">
                    {property.price.toLocaleString()}
                  </span>
                  <span className="text-gray-600 ml-2">SAR/year</span>
                </div>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 text-gray-600 hover:text-red-500">
                    <Heart className="h-5 w-5" />
                    Save
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500">
                    <Share2 className="h-5 w-5" />
                    Share
                  </button>
                </div>
              </div>
            </div>

            {/* Property Features */}
            <div className="bg-white rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4">Property Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                    <Bed className="h-6 w-6 text-[#0061A8]" />
                  </div>
                  <div className="font-semibold">{property.bedrooms}</div>
                  <div className="text-sm text-gray-600">Bedrooms</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                    <Bath className="h-6 w-6 text-[#0061A8]" />
                  </div>
                  <div className="font-semibold">{property.bathrooms}</div>
                  <div className="text-sm text-gray-600">Bathrooms</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                    <Square className="h-6 w-6 text-[#0061A8]" />
                  </div>
                  <div className="font-semibold">{property.area}</div>
                  <div className="text-sm text-gray-600">m²</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                    <MapPin className="h-6 w-6 text-[#0061A8]" />
                  </div>
                  <div className="font-semibold">{property.type}</div>
                  <div className="text-sm text-gray-600">Type</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Features & Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {property.features.map((feature, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <p className="text-gray-700 leading-relaxed">{property.description}</p>
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4">Specifications</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(property.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{key}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Neighborhood */}
            <div className="bg-white rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4">Neighborhood</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900">Education</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {property.neighborhood.schools.map((school, index) => (
                      <li key={index}>• {school}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900">Healthcare</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {property.neighborhood.hospitals.map((hospital, index) => (
                      <li key={index}>• {hospital}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900">Shopping</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {property.neighborhood.shopping.map((shop, index) => (
                      <li key={index}>• {shop}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900">Transport</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {property.neighborhood.transport.map((transport, index) => (
                      <li key={index}>• {transport}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Actions */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold mb-4">Contact Agent</h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleAction('contact')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90 transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  Contact Agent
                </button>
                <button
                  onClick={() => handleAction('schedule')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#00A859] text-white rounded-lg hover:bg-[#00A859]/90 transition-colors"
                >
                  <Calendar className="h-5 w-5" />
                  Schedule Viewing
                </button>
                <button
                  onClick={() => handleAction('offer')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FFB400] text-gray-900 rounded-lg hover:bg-[#FFB400]/90 transition-colors"
                >
                  <MessageSquare className="h-5 w-5" />
                  Make an Offer
                </button>
              </div>

              {/* Agent Info */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-600">
                      {property.agent.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold">{property.agent.name}</div>
                    <div className="text-sm text-gray-600">Licensed Agent</div>
                    {property.agent.verified && (
                      <div className="flex items-center gap-1 text-green-600 text-xs">
                        <Shield className="h-3 w-3" />
                        FAL Verified
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Similar Properties */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold mb-4">Similar Properties</h3>
              <div className="space-y-4">
                <Link href="/marketplace/properties/2" className="flex gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <img src="/placeholder-property.jpg" alt="Similar property" className="w-16 h-16 object-cover rounded" />
                  <div>
                    <div className="font-semibold text-sm">Apartment in Al Malaz</div>
                    <div className="text-sm text-gray-600">Riyadh • 75,000 SAR/year</div>
                  </div>
                </Link>
                <Link href="/marketplace/properties/3" className="flex gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <img src="/placeholder-property.jpg" alt="Similar property" className="w-16 h-16 object-cover rounded" />
                  <div>
                    <div className="font-semibold text-sm">Villa in Al Hamra</div>
                    <div className="text-sm text-gray-600">Jeddah • 120,000 SAR/year</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#0061A8]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-[#0061A8]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
              <p className="text-gray-600 mb-6">
                To protect users from fraud and ensure secure transactions, we require sign-in for contacting agents and making offers.
              </p>
              <div className="space-y-3">
                <Link
                  href={`/login?next=/marketplace/properties/${property.id}`}
                  className="block w-full px-4 py-3 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90 transition-colors"
                >
                  Sign In to Continue
                </Link>
                <Link
                  href={`/signup?next=/marketplace/properties/${property.id}`}
                  className="block w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Create New Account
                </Link>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="mt-4 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
