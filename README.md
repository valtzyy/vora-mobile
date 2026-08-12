# Vora — Tree Carbon Estimation from Video

Carbon measurement tool menggunakan 3D reconstruction (Gaussian Splatting) dari video smartphone.

## Apps

### 📱 Mobile (React Native/Expo)
- **Status:** MVP Ready (Phase 1 testing)
- **Location:** `apps/mobile`
- **Setup:** See [Mobile Setup Guide](#mobile-setup)
- **Features:** Home, Gallery, Upload, Result Dashboard

### 🌐 Web (Next.js)
- **Status:** Fully Working
- **Location:** `apps/web`
- **Features:** Landing page, Upload form, Splat 3D Viewer, Gallery, Public Plots

### 🔧 Backend (FastAPI)
- **Status:** Production Deployed
- **Location:** `apps/backend` atau repository terpisah
- **API Docs:** [Link ke API docs]

## Mobile Setup

### Prerequisites
- Node.js 18+
- npm atau pnpm
- Expo Go app installed on phone (iOS/Android)

### Installation

```bash
# Clone repo
git clone https://github.com/your-username/vora.git
cd vora

# Install dependencies
npm install

# Setup environment
cd apps/mobile
echo "EXPO_PUBLIC_API_BASE_URL=https://vora-api.example.com" > .env.local

# Start Expo
npm start

# Scan QR code dengan Expo Go
```

### Testing

See [Testing Guide](./docs/TESTING_GUIDE.md)

## Web Setup

Similar, check web folder docs.