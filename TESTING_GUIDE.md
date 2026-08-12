# Panduan Testing — Vora Mobile

Panduan ini untuk teman satu tim yang mau coba jalankan & uji aplikasi mobile Vora di HP masing-masing.

---

## 1. Yang Perlu Disiapkan

| Tool | Versi | Catatan |
|---|---|---|
| Node.js | 20 LTS | `node -v` |
| pnpm | 10.x | `npm install -g pnpm` kalau belum ada |
| Expo Go (app di HP) | mendukung **SDK 54** | Install dari Play Store / App Store |
| Python | 3.11+ | **hanya perlu kalau mau jalankan backend sendiri secara lokal** — lihat bagian 3 |

HP dan laptop **harus satu jaringan WiFi yang sama** (kecuali pakai tunnel, lihat bagian troubleshooting).

---

## 2. Setup Cepat (pakai backend yang sudah di-deploy)

Ini cara paling gampang — tidak perlu setup Python/Modal/Cloudflare sama sekali, langsung pakai backend yang sudah jalan online.

```bash
git clone https://github.com/valtzyy/vora-mobile.git
cd vora-mobile
pnpm install
cd apps/mobile
cp .env.example .env.local
```

Buka `.env.local`, isi dengan URL backend yang sudah di-deploy (minta ke ketua tim / cek di grup):

```
EXPO_PUBLIC_API_BASE_URL=https://vora-52k9.onrender.com
```

Lalu jalankan:

```bash
npx expo start -c
```

Scan QR code yang muncul pakai app **Expo Go** di HP.

> ⚠️ **Backend gratisan (Render free tier) tidur setelah 15 menit idle.** Request pertama bisa lambat 30-60 detik saat "bangunin" server — ini normal, bukan bug. Tunggu saja.

> ⚠️ **PENTING — satu scan dalam satu waktu untuk SELURUH TIM.** Backend saat ini masih pakai satu "slot" proses global (belum per-user — ini known limitation yang sedang diperbaiki di fase selanjutnya). **Kalau dua orang di tim upload video & mulai scan bersamaan ke backend yang sama, hasilnya bisa saling tabrakan/rusak.** Koordinasikan di grup tim: gantian, satu orang selesai baru orang berikutnya mulai.

---

## 3. Setup Alternatif — Jalankan Backend Sendiri (Lokal)

Pakai cara ini kalau: backend online sedang down, kamu mau debug backend, atau mau testing tanpa bentrok sama orang lain di tim.

```bash
git clone https://github.com/glacerous/vora.git
cd vora
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Isi `.env` dengan kredensial Cloudflare R2/D1 (minta ke pemilik project — **jangan commit file `.env` ke git**). Backend butuh ini untuk upload video, simpan hasil scan, dan Modal untuk GPU reconstruction.

```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Cari IP lokal laptop kamu (**bukan** `localhost` — HP tidak bisa resolve `localhost` ke laptopmu):
- Windows: `ipconfig` → cari `IPv4 Address` (biasanya `192.168.x.x`)
- Mac/Linux: `ifconfig` atau `ip addr`

Di `vora-mobile/apps/mobile/.env.local`:
```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000
```
(ganti dengan IP laptopmu, port default 8000)

Pastikan firewall laptop tidak block port 8000 dari jaringan lokal.

---

## 4. Fitur yang Bisa Diuji Sekarang

Status per 2026-08-13 — lihat bagian 6 untuk fitur yang **belum** ada.

### 4.1 Akun (opsional — scan bisa tanpa login)
- [ ] Buka app tanpa login → tab **Home**, **Gallery**, **New Scan** semua bisa dipakai
- [ ] Tab **Account** → Register akun baru → berhasil, diarahkan ke Login
- [ ] Login pakai akun demo: `juri_demo` / `demo123`, atau akun yang baru dibuat
- [ ] Setelah login, tab Account menampilkan nama & tombol Logout
- [ ] Tutup & buka ulang app → sesi login tetap tersimpan (tidak perlu login ulang)
- [ ] Logout → kembali ke form login

### 4.2 Scan Pohon (alur utama)
1. Tab **New Scan** → pilih sumber video:
   - **Record with Camera** — rekam langsung di app (perlu izin kamera & mic)
   - **Choose from Files** — pilih video yang sudah ada
2. Isi form (opsional): kode pohon, toggle "Remove Background", jumlah frame (10-100), blur threshold (10-200)
3. Tekan **Start Scan** → video diupload → tunggu status "Extracting Frames..."
4. Layar **Mark Trunk Axis** muncul dengan foto hasil ekstraksi frame pertama
   - [ ] Tap 2 titik di batang pohon (titik A = pangkal, titik B = ujung batang terlihat) → tombol "Use Selected Points" aktif
   - [ ] Atau tekan **Skip & Auto-Detect** tanpa menandai apapun
5. Layar **Processing** → progress bar + checklist tahap (Extracting → Reconstructing → Done), ada timer & tombol Cancel
   - Ini tahap paling lama (rekonstruksi 3D GPU via Modal), bisa **beberapa menit**
6. Layar **Result** — cek semua ini tampil:
   - [ ] Nilai CO2e utama + rentang ketidakpastian (mis. "639.3 – 781.4 kg CO₂e (±10%)")
   - [ ] Badge status kalibrasi skala (hijau "Kalibrasi OK" / kuning "Belum Kalibrasi")
   - [ ] Badge status kualitas rekonstruksi
   - [ ] DBH, tinggi, biomassa atas & bawah tanah
   - [ ] Klasifikasi spesies (kalau ada)
   - [ ] Panel "How This Was Calculated" (densitas kayu, zona iklim, formula)
   - [ ] Kalau ada warning (kalibrasi/kualitas/tinggi bermasalah), muncul panel peringatan berwarna

### 4.3 Gallery
- [ ] Tab **Gallery** menampilkan daftar scan (termasuk yang baru saja dibuat)
- [ ] Pull-to-refresh berfungsi
- [ ] Tap salah satu kartu scan → membuka Result screen scan tersebut

---

## 5. Troubleshooting

**"Cannot connect to backend" / network error saat scan**
- Cek `EXPO_PUBLIC_API_BASE_URL` di `.env.local` sudah benar
- Kalau pakai backend lokal: HP & laptop harus satu WiFi, pakai IP lokal (bukan `localhost`)
- Kalau pakai backend online: tunggu 30-60 detik untuk cold-start pertama kali

**Error native module saat pertama buka app** (`TurboModule`, `makeMutable`, dsb)
- Jalankan `npx expo start -c` (clear cache), lalu scan ulang QR
- Kalau masih error: hapus `node_modules` di root & `apps/mobile`, lalu `pnpm install` ulang dari root

**Expo Go bilang app butuh SDK yang tidak didukung**
- Update Expo Go di HP ke versi terbaru dari Play Store/App Store — project ini pakai **SDK 54**

**Scan orang lain "hilang" / status aneh saat dua orang scan bersamaan**
- Ini bug arsitektur yang sudah diketahui (lihat peringatan di bagian 2) — backend belum support banyak scan bersamaan. Koordinasikan gantian di tim.

**Upload video gagal / lama sekali**
- Video besar (>500MB) di jaringan lambat bisa lama — coba video lebih pendek dulu untuk testing
- Cek izin kamera/mikrofon sudah di-allow di setting HP kalau pakai rekam langsung

---

## 6. Yang Belum Ada (Jangan Laporkan Sebagai Bug)

Fitur-fitur ini memang belum dikerjakan, masih di roadmap:

- **Viewer 3D Gaussian Splat** — hasil scan belum bisa dilihat model 3D-nya di mobile (web sudah bisa)
- **Kalibrasi manual ulang** (recalculate 2D / adjust 3D geometry) — belum ada UI-nya
- **Fitur Plots** (kelompokkan pohon jadi kebun/plot, peta GPS, grid layout) — belum ada sama sekali di mobile
- Backend belum diperketat untuk multi-user bersamaan (lihat peringatan bagian 2) dan belum ada auth check di endpoint kalibrasi

Kalau nemu masalah di luar daftar di atas (crash, data salah, UI rusak, dll) — itu baru perlu dilaporkan.

---

## 7. Melaporkan Bug

Sertakan:
1. Langkah reproduce (dari layar mana, tap apa)
2. Screenshot/screen recording kalau bisa
3. Pakai backend online atau lokal?
4. Isi log error dari terminal `expo start` (biasanya muncul merah)
