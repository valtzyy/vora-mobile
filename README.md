# Vora Mobile — Tree Carbon Estimation from Video (React Native/Expo)

Versi mobile dari [Vora](https://github.com/glacerous/vora) — alat pengukuran karbon pohon dari video smartphone (3D Gaussian Splatting reconstruction + kalkulasi allometrik).

**Untuk teman tim yang mau mencoba menjalankan & menguji app ini, langsung ke → [TESTING_GUIDE.md](./TESTING_GUIDE.md).**

## Struktur Repo

Monorepo pnpm:
- `apps/mobile` — aplikasi React Native/Expo (SDK 54)
- `packages/types` — TypeScript types yang mencerminkan schema backend
- `packages/domain` — logic formatting & status display (dipakai bareng dengan potensi web)
- `packages/api-client` — HTTP client typed ke backend FastAPI

## Status Fitur

| Fitur | Status |
|---|---|
| Auth (login/register, akses anonim untuk scan) | ✅ |
| Scan pohon (kamera in-app + file picker, kalibrasi 2 titik, processing, hasil karbon lengkap) | ✅ |
| Gallery | ✅ |
| Viewer 3D Gaussian Splat | ⏳ belum |
| Kalibrasi manual (2D recalculate / 3D adjust-geometry) | ⏳ belum |
| Fitur Plots (kebun/grup pohon, peta GPS) | ⏳ belum |
| Multi-user scan bersamaan | ⚠️ backend masih single-flight (satu scan aktif untuk seluruh server) |

## Setup Cepat

```bash
git clone https://github.com/valtzyy/vora-mobile.git
cd vora-mobile
pnpm install
cd apps/mobile
cp .env.example .env.local   # isi EXPO_PUBLIC_API_BASE_URL
npx expo start -c
```

Scan QR code dengan app **Expo Go** (harus support SDK 54) di HP, satu jaringan WiFi dengan laptop.

Detail lengkap (setup backend lokal vs pakai backend online, checklist testing per fitur, troubleshooting) ada di **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**.

## Development

```bash
pnpm run type-check   # type-check semua package + app
```

`apps/mobile/AGENTS.md` — catatan penting: Expo SDK di project ini mungkin beda API-nya dari pengetahuan umum/training data AI assistant manapun. Cek dokumentasi versi yang terpasang sebelum mengubah kode yang menyentuh API Expo.
