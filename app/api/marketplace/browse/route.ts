// app/api/marketplace/browse/route.ts - Public API for browsing marketplace items
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'property'; // property, material
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Mock data for demonstration - replace with real database queries
    let items: any[] = [];

    if (type === 'property') {
      items = [
        {
          id: '1',
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
          features: ['Parking', 'Gym', 'Security'],
          description: 'Beautiful modern apartment in the heart of Riyadh with excellent amenities.',
          specifications: {
            'Property Type': 'Apartment',
            'Bedrooms': '2',
            'Bathrooms': '2',
            'Area': '120 m²'
          },
          location: {
            city: 'Riyadh',
            district: 'Al Olaya',
            coordinates: { lat: 24.7136, lng: 46.6753 }
          },
          agent: {
            name: 'Ahmed Al-Rashid',
            verified: true,
            license: 'FAL-123456'
          }
        },
        {
          id: '2',
          title: 'Luxury Villa in Jeddah',
          city: 'Jeddah',
          district: 'Al Hamra',
          price: 150000,
          currency: 'SAR',
          bedrooms: 4,
          bathrooms: 3,
          area: 250,
          type: 'Villa',
          verified: true,
          image: '/placeholder-property.jpg',
          features: ['Swimming Pool', 'Garden', 'Garage'],
          description: 'Spacious luxury villa with private garden and swimming pool.',
          specifications: {
            'Property Type': 'Villa',
            'Bedrooms': '4',
            'Bathrooms': '3',
            'Area': '250 m²'
          },
          location: {
            city: 'Jeddah',
            district: 'Al Hamra',
            coordinates: { lat: 21.4225, lng: 39.8262 }
          },
          agent: {
            name: 'Sarah Al-Mansouri',
            verified: true,
            license: 'FAL-789012'
          }
        },
        {
          id: '3',
          title: 'Commercial Office Space',
          city: 'Dammam',
          district: 'Al Khobar',
          price: 200000,
          currency: 'SAR',
          bedrooms: 0,
          bathrooms: 2,
          area: 180,
          type: 'Office',
          verified: false,
          image: '/placeholder-property.jpg',
          features: ['Central AC', 'Parking', 'Reception'],
          description: 'Prime commercial office space in a modern business district.',
          specifications: {
            'Property Type': 'Office',
            'Bedrooms': '0',
            'Bathrooms': '2',
            'Area': '180 m²'
          },
          location: {
            city: 'Dammam',
            district: 'Al Khobar',
            coordinates: { lat: 26.2172, lng: 50.1971 }
          },
          agent: {
            name: 'Mohammed Al-Dossary',
            verified: false,
            license: null
          }
        }
      ];
    } else if (type === 'material') {
      items = [
        {
          id: '1',
          name: 'Portland Cement 50kg',
          category: 'Cement',
          brand: 'Saudi Cement',
          price: 25,
          currency: 'SAR',
          inStock: true,
          rating: 4.5,
          reviews: 120,
          image: '/placeholder-material.jpg',
          description: 'High-quality Portland cement suitable for all construction needs.',
          specifications: ['50kg bag', 'Type I/II', 'ASTM C150 compliant'],
          vendor: {
            name: 'Saudi Building Materials Co.',
            verified: true,
            location: 'Riyadh'
          }
        },
        {
          id: '2',
          name: 'Steel Rebar 12mm',
          category: 'Steel',
          brand: 'SABIC',
          price: 8.50,
          currency: 'SAR',
          inStock: true,
          rating: 4.8,
          reviews: 85,
          image: '/placeholder-material.jpg',
          description: 'High-strength steel rebar for reinforced concrete construction.',
          specifications: ['12mm diameter', 'Grade 60', 'ASTM A615'],
          vendor: {
            name: 'SABIC Steel Division',
            verified: true,
            location: 'Jeddah'
          }
        },
        {
          id: '3',
          name: 'Ceramic Floor Tiles 60x60cm',
          category: 'Tiles',
          brand: 'RAK Ceramics',
          price: 45,
          currency: 'SAR',
          inStock: false,
          rating: 4.3,
          reviews: 200,
          image: '/placeholder-material.jpg',
          description: 'Premium ceramic floor tiles with excellent durability and finish.',
          specifications: ['60x60cm', 'Grade AA', 'Anti-slip surface'],
          vendor: {
            name: 'RAK Ceramics KSA',
            verified: true,
            location: 'Dammam'
          }
        }
      ];
    }

    // Apply filters
    let filteredItems = items;

    if (category && category !== 'All') {
      filteredItems = filteredItems.filter(item =>
        type === 'property' ? item.type === category : item.category === category
      );
    }

    if (city) {
      filteredItems = filteredItems.filter(item =>
        item.city?.toLowerCase().includes(city.toLowerCase()) ||
        item.location?.city?.toLowerCase().includes(city.toLowerCase()) ||
        item.vendor?.location?.toLowerCase().includes(city.toLowerCase())
      );
    }

    if (minPrice) {
      filteredItems = filteredItems.filter(item => item.price >= parseInt(minPrice));
    }

    if (maxPrice) {
      filteredItems = filteredItems.filter(item => item.price <= parseInt(maxPrice));
    }

    // Pagination
    const paginatedItems = filteredItems.slice(offset, offset + limit);

    // Add metadata for pagination
    const totalCount = filteredItems.length;
    const hasMore = offset + limit < totalCount;

    return NextResponse.json({
      success: true,
      data: paginatedItems,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore
      },
      filters: {
        type,
        category: category || 'All',
        city: city || '',
        priceRange: {
          min: minPrice || 0,
          max: maxPrice || 1000000
        }
      }
    });

  } catch (error) {
    console.error('Marketplace browse API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
