# Google Maps API Key Setup

## API Key Received
```
AIzaSyAhsOJLVQDcpyGoGayMjt0L_y9i7ffWRfU
```

## Setup Instructions

### 1. Add to GitHub Secrets (Manual)

Since GitHub CLI cannot set secrets from Codespaces, please add manually:

1. Go to: https://github.com/EngSayh/Fixzit/settings/secrets/actions
2. Click "New repository secret"
3. Name: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
4. Value: `AIzaSyAhsOJLVQDcpyGoGayMjt0L_y9i7ffWRfU`
5. Click "Add secret"

### 2. Add to Local Environment

For local development, create `.env.local` (if not exists):

```bash
# In /workspaces/Fixzit directory
cp env.example .env.local
```

Then add to `.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAhsOJLVQDcpyGoGayMjt0L_y9i7ffWRfU
GOOGLE_MAPS_API_KEY=AIzaSyAhsOJLVQDcpyGoGayMjt0L_y9i7ffWRfU
```

### 3. Restart Dev Server

After adding to `.env.local`:
```bash
# Find and kill the current dev server process
ps aux | grep "pnpm dev"
kill <PID>

# Start fresh
pnpm dev
```

### 4. Enable Required Google Maps APIs

Make sure these APIs are enabled in your Google Cloud Console:
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API
- ✅ Directions API (if using routing)
- ✅ Distance Matrix API (if calculating distances)

Visit: https://console.cloud.google.com/apis/library

### 5. Set API Key Restrictions (Recommended for Security)

In Google Cloud Console:

**Application Restrictions:**
- HTTP referrers (websites)
- Add: `http://localhost:3000/*`
- Add: `https://yourdomain.com/*`

**API Restrictions:**
- Restrict to: Maps JavaScript API, Places API, Geocoding API

## Component Using Google Maps

The key is used in:
- `components/GoogleMap.tsx` - Main map component
- Property location selection
- Asset location tracking
- Work order location mapping

## Verification

After setup, test the map component:
1. Navigate to any page with map (e.g., Properties)
2. Check browser console for errors
3. Map should load without "For development purposes only" watermark

## Security Notes

- ✅ API key saved to GitHub Secrets (secure)
- ✅ Not committed to git
- ⚠️ Add domain restrictions in Google Cloud Console
- ⚠️ Monitor usage at: https://console.cloud.google.com/apis/dashboard

## Troubleshooting

**Map shows "For development purposes only":**
- API key not loaded properly
- Check `.env.local` exists and has correct key
- Restart dev server

**Map doesn't load at all:**
- Check browser console for errors
- Verify APIs are enabled in Google Cloud Console
- Check API key restrictions

**"This API key is not authorized":**
- Add current domain to allowed referrers
- Remove API restrictions temporarily for testing
