# Google Maps API Integration - Complete Setup

## ✅ API Key Configured
```
AIzaSyAhsOJLVQDcpyGoGayMjt0L_y9i7ffWRfU
```

**Status**: ✅ Added to GitHub Secrets (by user)

**⚠️ CRITICAL: Billing Must Be Enabled**

The "OverQuotaMapError" means you need to:
1. Go to: https://console.cloud.google.com/billing
2. Link the project to a billing account
3. Enable billing for the Google Maps API

**Even with the free tier ($200/month credit), billing must be enabled.**

---

## 🗺️ Integration Overview

### Updated Component: `components/GoogleMap.tsx`

**New Features:**
- ✅ Advanced Marker API support (v=beta)
- ✅ Marker library loaded (`libraries=places,marker`)
- ✅ Enhanced error handling with user-friendly messages
- ✅ Proper cleanup (listeners, markers, map instances)
- ✅ XSS prevention using DOM nodes instead of template strings
- ✅ Loading and error states with visual feedback
- ✅ Map ID support for advanced markers (`mapId` prop)

**API Script URL:**
```javascript
https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,marker&v=beta
```

---

## 📍 Modules Using Google Maps

### 1. Aqar (Real Estate) Module
**File**: `app/aqar/map/page.tsx`
- Property location visualization
- Interactive map with property markers
- Click-to-search functionality
- Default center: Riyadh, Saudi Arabia (24.7136, 46.6753)

### 2. Property Management
**Files**:
- `app/fm/properties/page.tsx` - Property listings with addresses
- `app/fm/dashboard/page.tsx` - Dashboard with property locations
- Property creation/edit forms

**Features**:
- Property location selection
- Address geocoding
- Property clustering on map

### 3. Asset Tracking
**Potential Use**: Asset location tracking within properties

### 4. Work Orders
**Potential Use**: Work order location mapping

### 5. Vendor Management  
**Potential Use**: Vendor service area visualization

---

## 🚀 Deployment Configuration

### 1. GitHub Secrets (✅ Complete)

Already added by user:
- Secret name: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Value: `AIzaSyAhsOJLVQDcpyGoGayMjt0L_y9i7ffWRfU`

### 2. Environment Variables

**Local Development** (`.env.local`):
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAhsOJLVQDcpyGoGayMjt0L_y9i7ffWRfU
GOOGLE_MAPS_API_KEY=AIzaSyAhsOJLVQDcpyGoGayMjt0L_y9i7ffWRfU
ENABLE_GOOGLE_MAPS=true
```

**Production** (Hosting Platform):
Add to environment variables in:
- Vercel: Project Settings → Environment Variables
- AWS Amplify: App Settings → Environment Variables  
- Netlify: Site Settings → Environment Variables

### 3. Required Google Cloud APIs

Enable these in Google Cloud Console:
- ✅ **Maps JavaScript API** (core maps functionality)
- ✅ **Places API** (location search and autocomplete)
- ✅ **Geocoding API** (address to coordinates)
- ⚠️ **Directions API** (optional - for routing)
- ⚠️ **Distance Matrix API** (optional - for distance calculations)

**Enable APIs**: https://console.cloud.google.com/apis/library

---

## 🔒 Security Configuration

### API Key Restrictions (RECOMMENDED)

**Application Restrictions:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your API key
3. Under "Application restrictions", select **HTTP referrers**
4. Add these referrers:
   ```
   http://localhost:3000/*
   https://your-domain.com/*
   https://*.your-domain.com/*
   ```

**API Restrictions:**
Restrict key to only these APIs:
- Maps JavaScript API
- Places API
- Geocoding API

### Why Restrictions Are Important:
- ✅ Prevents unauthorized usage
- ✅ Reduces risk of API quota theft
- ✅ Limits potential costs from abuse
- ✅ Protects against scraping

---

## 💻 Usage Examples

### Basic Map
```tsx
import GoogleMap from '@/components/GoogleMap';

<GoogleMap
  center={{ lat: 24.7136, lng: 46.6753 }}
  zoom={13}
  height="400px"
/>
```

### Map with Markers
```tsx
<GoogleMap
  center={{ lat: 24.7136, lng: 46.6753 }}
  zoom={13}
  markers={[
    {
      position: { lat: 24.7136, lng: 46.6753 },
      title: 'Property Name',
      info: 'Property description and details'
    }
  ]}
  height="500px"
/>
```

### Interactive Map with Click Handler
```tsx
const [selectedLocation, setSelectedLocation] = useState(null);

<GoogleMap
  center={{ lat: 24.7136, lng: 46.6753 }}
  zoom={13}
  onMapClick={(lat, lng) => {
    setSelectedLocation({ lat, lng });
    console.log('Selected:', lat, lng);
  }}
  height="600px"
  mapId="CUSTOM_MAP_ID" // Optional: custom map styling
/>
```

---

## 🧪 Testing Checklist

### Local Testing:
- [ ] Navigate to http://localhost:3000/aqar/map
- [ ] Verify map loads without "For development purposes only" watermark
- [ ] Check browser console for errors
- [ ] Test marker placement and info windows
- [ ] Test map click functionality
- [ ] Test on different screen sizes (mobile, tablet, desktop)

### Production Testing:
- [ ] Verify map loads on production domain
- [ ] Check that referrer restrictions allow your domain
- [ ] Monitor API usage in Google Cloud Console
- [ ] Test performance (map load times)

---

## 📊 Monitoring & Quotas

### Google Cloud Console Monitoring:
1. Go to: https://console.cloud.google.com/apis/dashboard
2. Check daily usage statistics
3. Set up budget alerts (recommended)

### Free Tier Limits (as of 2025):
- **Maps JavaScript API**: $200 free credit/month
- **Places API**: $200 free credit/month  
- **Geocoding API**: $200 free credit/month

### Cost Monitoring:
```
Dynamic Maps: $7 per 1,000 loads (after free tier)
Static Maps: $2 per 1,000 loads
Geocoding: $5 per 1,000 requests
Places API: $17 per 1,000 requests
```

**Budget Alert Recommended**: Set at $50/month

---

## 🐛 Troubleshooting

### ⚠️ OverQuotaMapError (MOST COMMON)
**Error**: `Google Maps JavaScript API error: OverQuotaMapError`

**Cause**: Billing is not enabled in Google Cloud Console

**Fix**:
1. Go to: https://console.cloud.google.com/billing
2. Select your project
3. Click "Link a billing account"
4. Add a credit card (you won't be charged with $200/month free tier)
5. Return to: https://console.cloud.google.com/google/maps-apis/apis
6. Ensure "Maps JavaScript API" is enabled
7. Wait 1-2 minutes for changes to propagate
8. Refresh your page

**Note**: Google requires billing info even though you get $200 free credit monthly. Without billing enabled, ALL map loads will fail.

### Map shows "For development purposes only"
**Cause**: API key not loaded or invalid
**Fix**: 
1. Check `.env.local` has correct key
2. Restart dev server: `pnpm dev`
3. Verify GitHub secret is set correctly

### Map doesn't load at all
**Cause**: Script loading error or API disabled
**Fix**:
1. Check browser console for errors
2. Verify APIs are enabled in Google Cloud Console
3. Check network tab for script load failures
4. Ensure API key has no referrer restrictions in dev

### "This page can't load Google Maps correctly"
**Cause**: API key restrictions or billing issue
**Fix**:
1. Check referrer restrictions match your domain
2. Verify billing is enabled in Google Cloud Console
3. Check API key is not expired
4. Ensure daily quota not exceeded

### Markers don't appear
**Cause**: Marker library not loaded or coordinates invalid
**Fix**:
1. Verify `libraries=places,marker` in script URL
2. Check marker coordinates are valid (lat: -90 to 90, lng: -180 to 180)
3. Check console for marker creation errors

### Map loads but shows error message
**Cause**: Runtime error or missing permissions
**Fix**:
1. Check component error state in browser
2. Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
3. Check browser console for detailed error messages

---

## ✅ Completion Status

- [x] API key obtained from Google Cloud Console
- [x] API key added to GitHub Secrets
- [x] GoogleMap component updated with Advanced Markers
- [x] Error handling and XSS prevention implemented
- [x] Libraries loaded (places, marker)
- [x] Map ID support added
- [x] Documentation complete
- [ ] **TODO**: Test on production deployment
- [ ] **TODO**: Set up API key restrictions (referrers)
- [ ] **TODO**: Set up budget alerts in Google Cloud Console

---

## 🔗 Useful Links

- **Google Maps Platform**: https://developers.google.com/maps
- **API Key Management**: https://console.cloud.google.com/apis/credentials
- **Usage Dashboard**: https://console.cloud.google.com/apis/dashboard
- **Pricing Calculator**: https://mapsplatform.google.com/pricing/
- **Documentation**: https://developers.google.com/maps/documentation/javascript
- **Advanced Markers**: https://developers.google.com/maps/documentation/javascript/advanced-markers

---

**Last Updated**: October 19, 2025  
**Status**: ✅ Integration Complete - Ready for Testing
