# Vora Testing Guide

## Quick Start

### Mobile (Expo)

```bash
cd apps/mobile
npm install
npm start
# Scan QR dengan Expo Go
```

### Web

```bash
cd apps/web
npm install
npm run dev
# Open http://localhost:3000
```

## Testing Workflow

1. **Upload Video**
   - App home → "Start New Scan"
   - Pick video file
   - Click "Upload & Process"

2. **Wait for Processing**
   - Backend process dengan GPU (5-10 min)
   - App poll status every 3 sec

3. **View Results**
   - DBH, height, biomass, CO2e displayed
   - Species classification shown
   - (Phase 2) Splat viewer loads

4. **Check Gallery**
   - Tab "Gallery" shows all scans
   - Data persisted in backend database

## Production URLs

- Backend API: https://vora-api.example.com
- Web: https://vora.example.com
- Mobile: Expo Go (development)

## Troubleshooting

### Mobile Error: "Cannot connect to backend"
- Check API_BASE_URL in .env.local
- Ensure backend is running
- Check network (WiFi vs cellular)

### Upload fails
- Video file valid? (MP4, MOV, WebM)
- File size < 500MB?
- Network stable?

### Results not showing
- Wait 5-10 min (GPU processing queue)
- Check backend logs

See [Troubleshooting](./docs/TROUBLESHOOTING.md) for more.