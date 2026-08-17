import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

/**
 * Display-language switching, mirroring the web app's implementation in
 * vora-frontend/src/components/AuthProvider.tsx — same `id`/`en` codes, same
 * "id" default, same `t(key, fallback)` shape, and the same translation keys
 * wherever a string exists on both platforms, so wording stays in sync.
 *
 * The web persists to localStorage; there's no such thing here, so this uses
 * SecureStore (already a dependency for the auth token). A language preference
 * isn't a secret, but reaching for it avoids pulling in AsyncStorage purely to
 * store one short string.
 *
 * Only the language setting is implemented. The web's other settings (units,
 * splat quality, auto-rotate, FPS) are deliberately not carried over.
 */

export type Language = 'id' | 'en';

const LANG_KEY = 'vora_lang';

export const translations: Record<string, { id: string; en: string }> = {
  // ── Settings ────────────────────────────────────────────────────────────
  'nav.settings': { id: 'Pengaturan', en: 'Settings' },
  'settings.title': { id: 'Pengaturan Sistem', en: 'System Settings' },
  'settings.subtitle': {
    id: 'Sesuaikan preferensi bahasa aplikasi.',
    en: 'Customize your app language preference.',
  },
  'settings.language': { id: 'Bahasa Tampilan', en: 'Display Language' },
  'settings.languageDesc': {
    id: 'Pilih bahasa antarmuka aplikasi Vora.',
    en: 'Choose the interface language for Vora.',
  },
  'settings.saved': { id: 'Tersimpan otomatis', en: 'Auto-saved' },
  'settings.close': { id: 'Tutup', en: 'Close' },

  // ── Bottom tabs ─────────────────────────────────────────────────────────
  'tab.home': { id: 'Beranda', en: 'Home' },
  'tab.gallery': { id: 'Galeri', en: 'Gallery' },
  'tab.scan': { id: 'Scan Baru', en: 'New Scan' },
  'tab.dashboard': { id: 'Dasbor', en: 'Dashboard' },
  'tab.account': { id: 'Akun', en: 'Account' },

  // ── Home ────────────────────────────────────────────────────────────────
  'home.tagline': {
    id: 'Ukur karbon pohon dari video ponsel.',
    en: 'Measure tree carbon from smartphone video.',
  },
  'home.howItWorks': { id: 'Cara kerjanya', en: 'How it works' },
  'home.step1Title': { id: 'Rekam Video', en: 'Record Video' },
  'home.step1Desc': {
    id: 'Rekam video singkat mengelilingi batang pohon dengan ponsel Anda',
    en: 'Film a short video around the tree trunk using your smartphone',
  },
  'home.step2Title': { id: 'Proses', en: 'Process' },
  'home.step2Desc': {
    id: 'AI kami merekonstruksi pohon dalam 3D dan menghitung kandungan karbon',
    en: 'Our AI reconstructs the tree in 3D and calculates carbon content',
  },
  'home.step3Title': { id: 'Lihat Hasil', en: 'View Results' },
  'home.step3Desc': {
    id: 'Lihat DBH, tinggi, biomassa, dan estimasi CO2e secara instan',
    en: 'See DBH, height, biomass, and CO2e estimation instantly',
  },
  'home.startScan': { id: 'Mulai Scan Baru', en: 'Start New Scan' },
  'home.viewPast': { id: 'Lihat Scan Sebelumnya', en: 'View Past Scans' },
  'home.signedInAs': { id: 'Masuk sebagai', en: 'Signed in as' },
  'home.browsingAnon': {
    id: 'Menjelajah tanpa akun — masuk untuk menyimpan scan ke plot',
    en: 'Browsing without an account — sign in to save scans to plots',
  },
  'common.logout': { id: 'Keluar', en: 'Log Out' },
  'common.signIn': { id: 'Masuk', en: 'Sign In' },
  'common.retry': { id: 'Coba Lagi', en: 'Try Again' },
  'common.cancel': { id: 'Batal', en: 'Cancel' },

  // ── New Scan ────────────────────────────────────────────────────────────
  'scan.title': { id: 'Rekonstruksi baru', en: 'New reconstruction' },
  'scan.subtitle': {
    id: 'Rekam atau unggah video untuk memulai pipeline 3D.',
    en: 'Record or upload a video walkthrough to start the 3D pipeline.',
  },
  'scan.treeId': { id: 'Identitas pohon', en: 'Tree identifier' },
  'scan.optional': { id: '(opsional)', en: '(optional)' },
  'scan.removeBg': { id: 'Hapus Latar Belakang', en: 'Remove Background' },
  'scan.removeBgDesc': {
    id: 'Isolasi pohon dan hilangkan objek latar untuk visualisasi 3D yang bersih.',
    en: 'Isolate the tree and remove background objects for a clean 3D visualization.',
  },
  'scan.videoSource': { id: 'Video walkthrough', en: 'Video walkthrough' },
  'scan.recordCamera': { id: 'Rekam Kamera', en: 'Record Camera' },
  'scan.chooseFile': { id: 'Pilih Berkas', en: 'Choose File' },
  'scan.selectedVideo': { id: 'Video Terpilih', en: 'Selected Video' },
  'scan.clear': { id: 'Hapus', en: 'Clear' },
  'scan.framesToExtract': { id: 'Frame yang diekstrak', en: 'Frames to extract' },
  'scan.blurThreshold': { id: 'Ambang filter blur', en: 'Blur filter threshold' },
  'scan.start': { id: 'Mulai Scan', en: 'Start Scan' },
  'scan.uploading': { id: 'Mengunggah Video...', en: 'Uploading Video...' },
  'scan.extracting': { id: 'Mengekstrak Frame...', en: 'Extracting Frames...' },
  'scan.failed': { id: 'Scan Gagal', en: 'Scan Failed' },
  'scan.arActive': {
    id: 'Pelacakan Metrik ARCore VIO Aktif',
    en: 'ARCore VIO Metric Tracking Active',
  },
  'scan.arInactive': { id: 'Mode Skala Geometrik MASt3R', en: 'MASt3R Geometric Scale Mode' },
  'scan.cameraHint': {
    id: 'Berjalan perlahan mengelilingi batang, jaga tetap di tengah',
    en: 'Walk slowly around the trunk, keep it centered',
  },

  'scan.videoTooLarge': { id: 'Berkas Video Terlalu Besar', en: 'Video File Too Large' },
  'scan.videoTooLargeMsg': {
    id: 'Ukuran maksimum 150MB. Pilih video berdurasi 15–30 detik.',
    en: 'Maximum allowed size is 150MB. Please select a 15–30s video.',
  },
  'scan.videoSelected': { id: 'Video terpilih berukuran', en: 'Selected video is' },
  'scan.pickFailed': {
    id: 'Gagal memilih berkas video dari perangkat.',
    en: 'Failed to pick video file from device.',
  },
  'scan.cameraPermission': { id: 'Perlu Izin Kamera', en: 'Camera Permission Needed' },
  'scan.cameraPermissionMsg': {
    id: 'Aktifkan akses kamera untuk merekam video scan.',
    en: 'Enable camera access to record a scan video.',
  },
  'scan.recordFailed': { id: 'Perekaman Gagal', en: 'Recording Failed' },
  'scan.recordFailedMsg': {
    id: 'Tidak dapat merekam video. Coba lagi atau pilih berkas.',
    en: 'Could not record video. Please try again or pick a file instead.',
  },
  'scan.noVideo': { id: 'Belum Ada Video', en: 'No Video Selected' },
  'scan.noVideoMsg': {
    id: 'Rekam atau pilih video scan pohon terlebih dahulu.',
    en: 'Record or choose a tree scan video first.',
  },

  // ── 3D viewer ───────────────────────────────────────────────────────────
  'viewer.crashed': { id: 'WebView berhenti', en: 'WebView crashed' },
  'viewer.crashedHint': {
    id: 'Memori perangkat mungkin tidak mencukupi.',
    en: 'Device may be low on memory.',
  },
  'viewer.loadSplat': { id: 'Muat Gaussian Splat', en: 'Load Gaussian Splat' },

  // ── Dashboard ───────────────────────────────────────────────────────────
  'dash.title': { id: 'Dasbor', en: 'Dashboard' },
  'dash.myTrees': { id: 'Pohon Saya', en: 'My Trees' },
  'dash.myPlots': { id: 'Plot Saya', en: 'My Plots' },
  'dash.yourTrees': { id: 'pohon Anda', en: 'of your trees' },
  'dash.yourPlots': { id: 'plot Anda', en: 'of your plots' },
  'dash.newPlot': { id: '+ Plot Baru', en: '+ New Plot' },
  'dash.signInRequired': { id: 'Perlu Masuk', en: 'Sign In Required' },
  'dash.signInDesc': {
    id: 'Masuk dari tab Akun untuk mengakses dasbor pribadi, melihat plot, dan mengelola pengukuran pohon Anda.',
    en: 'Log in from the Account tab to access your private dashboard, view your plots, and manage your tree measurements.',
  },
  'dash.goToAccount': { id: 'Buka Akun', en: 'Go to Account' },
  'dash.loadingTrees': { id: 'Memuat Pohon Saya...', en: 'Loading My Trees...' },
  'dash.loadingPlots': { id: 'Memuat Plot Saya...', en: 'Loading My Plots...' },
  'dash.connectionFailed': { id: 'Koneksi Gagal', en: 'Connection Failed' },
  'dash.connectionFailedDesc': {
    id: 'Terjadi kesalahan jaringan saat menghubungi server Vora.',
    en: 'A network error occurred while connecting to the Vora server.',
  },
  'dash.noTrees': { id: 'Tidak Ada Pohon', en: 'No Trees Found' },
  'dash.noPlots': { id: 'Tidak Ada Plot', en: 'No Plots Found' },
  'dash.noTreesDesc': {
    id: 'Anda belum memindai atau mengklaim pohon apa pun di akun Anda.',
    en: "You haven't scanned or claimed any trees under your account yet.",
  },
  'dash.noPlotsDesc': {
    id: 'Anda belum membuat atau mengklaim plot apa pun di akun Anda.',
    en: "You haven't created or claimed any plots under your account yet.",
  },
  'dash.createFirstPlot': { id: 'Buat Plot Pertama Anda', en: 'Create Your First Plot' },
  'dash.trees': { id: 'pohon', en: 'trees' },
  'dash.view': { id: 'Lihat', en: 'View' },
  'dash.invalidScan': { id: 'Scan tidak valid', en: 'Invalid scan' },

  // ── Gallery ─────────────────────────────────────────────────────────────
  'gallery.title': { id: 'Galeri Scan', en: 'Scan Gallery' },
  'gallery.publicTrees': { id: 'Pohon Publik', en: 'Public Trees' },
  'gallery.publicPlots': { id: 'Plot Publik', en: 'Public Plots' },
  'gallery.countTrees': { id: 'pohon publik', en: 'public trees' },
  'gallery.countPlots': { id: 'plot publik', en: 'public plots' },
  'gallery.loadingTrees': { id: 'Memuat Pohon...', en: 'Loading Trees...' },
  'gallery.loadingPlots': { id: 'Memuat Plot...', en: 'Loading Plots...' },
  'gallery.noTrees': { id: 'Belum Ada Pohon Publik', en: 'No Public Trees Yet' },
  'gallery.noPlots': { id: 'Belum Ada Plot Publik', en: 'No Public Plots Yet' },
  'gallery.noTreesDesc': {
    id: 'Belum ada scan pohon yang dipublikasikan oleh komunitas.',
    en: 'No tree scans have been made public by the community yet.',
  },
  'gallery.noPlotsDesc': {
    id: 'Belum ada plot kehutanan yang dipublikasikan oleh anggota Vora.',
    en: 'No forestry plots have been set to public by Vora members yet.',
  },

  // ── Auth ────────────────────────────────────────────────────────────────
  'auth.welcomeBack': { id: 'Selamat Datang', en: 'Welcome Back' },
  'auth.loginSubtitle': {
    id: 'Masuk ke Vora untuk melanjutkan scan pohon Anda',
    en: 'Sign in to Vora to continue your tree scans',
  },
  'auth.createAccount': { id: 'Buat Akun', en: 'Create Account' },
  'auth.registerSubtitle': {
    id: 'Bergabung dengan Vora untuk mulai mengukur karbon pohon',
    en: 'Join Vora to start measuring tree carbon',
  },
  'auth.username': { id: 'Nama Pengguna', en: 'Username' },
  'auth.usernamePlaceholder': { id: 'Masukkan nama pengguna', en: 'Enter your username' },
  'auth.usernamePick': { id: 'Pilih nama pengguna unik', en: 'Choose a unique username' },
  'auth.password': { id: 'Kata Sandi', en: 'Password' },
  'auth.passwordPlaceholder': { id: 'Masukkan kata sandi', en: 'Enter your password' },
  'auth.passwordCreate': { id: 'Buat kata sandi yang kuat', en: 'Create a strong password' },
  'auth.confirmPassword': { id: 'Konfirmasi Kata Sandi', en: 'Confirm Password' },
  'auth.confirmPlaceholder': { id: 'Ulangi kata sandi Anda', en: 'Repeat your password' },
  'auth.displayName': { id: 'Nama Tampilan', en: 'Display Name' },
  'auth.displayNamePlaceholder': { id: 'Mis. Budi Santoso', en: 'E.g. John Doe' },
  'auth.signUp': { id: 'Daftar', en: 'Sign Up' },
  'auth.demoAccount': { id: 'Akun demo:', en: 'Demo account:' },
  'auth.noAccount': { id: 'Belum punya akun? ', en: "Don't have an account? " },
  'auth.haveAccount': { id: 'Sudah punya akun? ', en: 'Already have an account? ' },
  'auth.continueWithout': { id: 'Lanjut tanpa akun', en: 'Continue without an account' },
  'auth.error': { id: 'Kesalahan', en: 'Error' },
  'auth.enterBoth': {
    id: 'Masukkan nama pengguna dan kata sandi',
    en: 'Please enter both username and password',
  },
  'auth.loginFailed': { id: 'Gagal Masuk', en: 'Login Failed' },
  'auth.checkCredentials': {
    id: 'Periksa kembali kredensial Anda lalu coba lagi.',
    en: 'Check your credentials and try again.',
  },
  'auth.fillAll': { id: 'Lengkapi semua kolom', en: 'Please fill in all fields' },
  'auth.passwordMismatch': { id: 'Kata sandi tidak cocok', en: 'Passwords do not match' },
  'auth.success': { id: 'Berhasil', en: 'Success' },
  'auth.accountCreated': {
    id: 'Akun Anda berhasil dibuat. Silakan masuk.',
    en: 'Your account has been created successfully. Please sign in.',
  },
  'auth.registrationFailed': { id: 'Pendaftaran Gagal', en: 'Registration Failed' },
  'auth.couldNotCreate': { id: 'Tidak dapat membuat akun.', en: 'Could not create account.' },

  // ── Scan processing ─────────────────────────────────────────────────────
  'proc.timeoutTitle': { id: 'Waktu Proses Habis (210 dtk)', en: 'Processing Timeout (210s)' },
  'proc.timeoutDesc': {
    id: 'Rekonstruksi berjalan lebih lama dari biasanya (lebih dari 3,5 menit). GPU cloud mungkin sedang antre sementara.',
    en: 'Reconstruction is taking longer than usual (over 3.5 minutes). The cloud GPU may be in a temporary queue delay.',
  },
  'proc.retryScan': { id: 'Ulangi Scan', en: 'Retry Scan' },
  'proc.returnDashboard': { id: 'Kembali ke Dasbor', en: 'Return to Dashboard' },
  'proc.failedTitle': { id: 'Proses Gagal', en: 'Processing Failed' },
  'proc.backToSetup': { id: 'Kembali ke Pengaturan Scan', en: 'Back to Scan Setup' },
  'proc.elapsed': { id: 'Berjalan', en: 'Elapsed' },
  'proc.treeCode': { id: 'KODE POHON:', en: 'TREE CODE:' },
  'proc.runBackground': { id: 'Jalankan di Latar Belakang', en: 'Run in Background' },
  'proc.cancelTitle': { id: 'Batalkan Rekonstruksi?', en: 'Cancel Reconstruction?' },
  'proc.cancelMsg': {
    id: 'Yakin ingin menghentikan scan rekonstruksi 3D ini?',
    en: 'Are you sure you want to abort this 3D reconstruction scan?',
  },
  'proc.keepScanning': { id: 'Lanjut Scan', en: 'Keep Scanning' },
  'proc.cancelScan': { id: 'Batalkan Scan', en: 'Cancel Scan' },
  'proc.reconstructFailed': {
    id: 'Rekonstruksi gagal di server.',
    en: 'Reconstruction failed on the server.',
  },
  'proc.lostConnection': {
    id: 'Koneksi terputus saat memproses scan.',
    en: 'Lost connection while processing the scan.',
  },

  // ── Mark trunk axis ─────────────────────────────────────────────────────
  'mark.title': { id: 'Tandai Sumbu Batang', en: 'Mark Trunk Axis' },
  'mark.subtitle': {
    id: 'Ketuk pangkal batang, lalu ujung atas batang yang terlihat. Ini mengalibrasi skala dunia nyata dari rekonstruksi 3D. Anda juga bisa melewatinya dan membiarkan deteksi otomatis bekerja.',
    en: 'Tap the base of the trunk, then the top of the visible trunk. This calibrates the real-world scale of the 3D reconstruction. You can also skip this and let auto-detection handle it.',
  },
  'mark.usePoints': { id: 'Gunakan Titik Terpilih', en: 'Use Selected Points' },
  'mark.starting': { id: 'Memulai...', en: 'Starting...' },
  'mark.skip': { id: 'Lewati & Deteksi Otomatis', en: 'Skip & Auto-Detect' },
  'mark.couldNotStart': {
    id: 'Tidak Dapat Memulai Rekonstruksi',
    en: 'Could Not Start Reconstruction',
  },
  'trunk.loadError': {
    id: 'Tidak dapat memuat frame referensi.',
    en: 'Could not load the reference frame.',
  },
  'trunk.reset': { id: 'Atur Ulang', en: 'Reset' },

  // ── Scan result ─────────────────────────────────────────────────────────
  'result.loading': { id: 'Memuat Hasil Scan...', en: 'Loading Scan Result...' },
  'result.couldNotLoad': { id: 'Tidak Dapat Memuat Hasil', en: 'Could Not Load Result' },
  'result.noData': { id: 'Tidak ada data scan untuk', en: 'No scan data found for' },
  'result.complete': { id: 'Scan 3D Selesai', en: '3D Scan Complete' },
  'result.estimatedCarbon': { id: 'Perkiraan Karbon Tersimpan', en: 'Estimated Carbon Stored' },
  'result.allometrics': { id: 'Alometri Pohon', en: 'Tree Allometrics' },
  'result.dbh': { id: 'DBH (Diameter Batang)', en: 'DBH (Trunk Diameter)' },
  'result.height': { id: 'Tinggi', en: 'Height' },
  'result.agb': { id: 'Biomassa Atas Tanah', en: 'Above-Ground Biomass' },
  'result.bgb': { id: 'Biomassa Bawah Tanah', en: 'Below-Ground Biomass' },
  'result.speciesId': { id: 'Identifikasi Spesies', en: 'Species Identification' },
  'result.match': { id: 'kecocokan', en: 'match' },
  'result.allPredictions': { id: 'Semua Prediksi', en: 'All Predictions' },
  'result.howCalculated': { id: 'Cara Perhitungan Ini', en: 'How This Was Calculated' },
  'result.woodDensity': { id: 'Kerapatan kayu', en: 'Wood density' },
  'result.climateZone': { id: 'Zona iklim', en: 'Climate zone' },
  'result.formulaUsed': { id: 'Formula yang dipakai', en: 'Formula used' },
  'result.rootShoot': { id: 'Rasio akar-tajuk', en: 'Root-to-shoot ratio' },
  'result.unknown': { id: 'Tidak diketahui', en: 'Unknown' },
  'result.gpsLabel': { id: 'GPS', en: 'GPS' },
  'result.recalibrate': { id: 'Kalibrasi Ulang Batang (Foto 2D)', en: 'Recalibrate Trunk (2D Photo)' },
  'result.thingsToKnow': {
    id: 'Hal yang Perlu Diketahui Tentang Estimasi Ini',
    en: 'Things to Know About This Estimate',
  },
  'result.scanHistory': { id: 'Riwayat Scan', en: 'Scan History' },
  'result.claimToPlot': { id: 'Klaim ke Plot', en: 'Claim to a Plot' },
  'result.viewCertificate': { id: 'Lihat Sertifikat Karbon', en: 'View Carbon Certificate' },
  'result.share': { id: 'Bagikan', en: 'Share' },
  'result.shareFailed': { id: 'Gagal membagikan scan ini.', en: 'Failed to share this scan.' },

  // ── Certificate ─────────────────────────────────────────────────────────
  'cert.title': { id: 'Sertifikat', en: 'Certificate' },
  'cert.view': { id: 'Lihat Sertifikat', en: 'View Certificate' },
  'cert.download': { id: 'Unduh', en: 'Download' },
  'cert.shareFailed': { id: 'Gagal membagikan sertifikat.', en: 'Failed to share certificate.' },

  // ── Plots ───────────────────────────────────────────────────────────────
  'plot.couldNotLoad': { id: 'Tidak Dapat Memuat Plot', en: 'Could Not Load Plot' },
  'plot.retry': { id: 'Coba Lagi', en: 'Retry' },
  'plot.edit': { id: 'Ubah', en: 'Edit' },
  'plot.trees': { id: 'Pohon', en: 'Trees' },
  'plot.avgDbh': { id: 'Rata-rata DBH', en: 'Avg DBH' },
  'plot.avgHeight': { id: 'Rata-rata Tinggi', en: 'Avg Height' },
  'plot.grid': { id: 'Petak', en: 'Grid' },
  'plot.noTreesYet': { id: 'Belum ada pohon di plot ini.', en: 'No trees in this plot yet.' },
  'plot.remove': { id: 'Keluarkan', en: 'Remove' },
  'plot.removeTitle': { id: 'Keluarkan Pohon', en: 'Remove Tree' },
  'plot.removeMsg': {
    id: 'dari plot ini? Pohon akan bisa diklaim kembali.',
    en: 'from this plot? It will become claimable again.',
  },
  'plot.couldNotRemove': { id: 'Tidak Dapat Mengeluarkan Pohon', en: 'Could Not Remove Tree' },
  'plot.gridHint': {
    id: 'Seret pohon untuk menatanya secara spasial. Posisi tersimpan otomatis.',
    en: 'Drag a tree to arrange it spatially. Positions auto-save.',
  },
  'plot.noGps': {
    id: 'Belum ada data GPS untuk plot ini.',
    en: 'No GPS data available for this plot yet.',
  },
  'plot.createTitle': { id: 'Buat Plot', en: 'Create Plot' },
  'plot.editTitle': { id: 'Ubah Plot', en: 'Edit Plot' },
  'plot.name': { id: 'Nama', en: 'Name' },
  'plot.namePlaceholder': { id: 'mis. Kebun Belakang Kampus', en: 'e.g. Kebun Belakang Kampus' },
  'plot.description': { id: 'Deskripsi', en: 'Description' },
  'plot.descriptionOptional': { id: 'Deskripsi (opsional)', en: 'Description (optional)' },
  'plot.descriptionPlaceholder': { id: 'Untuk apa plot ini?', en: 'What is this plot for?' },
  'plot.public': { id: 'Publik', en: 'Public' },
  'plot.publicHint': {
    id: 'Plot publik terlihat oleh semua orang di Galeri.',
    en: 'Public plots are visible to everyone in the Gallery.',
  },
  'plot.targetCo2eOptional': { id: 'Target CO2e (kg, opsional)', en: 'Target CO2e (kg, optional)' },
  'plot.targetCo2e': { id: 'Target CO2e (kg)', en: 'Target CO2e (kg)' },
  'plot.gpsCentroid': { id: 'Titik Pusat GPS (opsional)', en: 'GPS Centroid (optional)' },
  'plot.noLocation': { id: 'Belum ada lokasi.', en: 'No location set.' },
  'plot.useCurrentLocation': { id: 'Gunakan Lokasi Saat Ini', en: 'Use Current Location' },
  'plot.saveChanges': { id: 'Simpan Perubahan', en: 'Save Changes' },
  'plot.nameRequired': { id: 'Nama Wajib Diisi', en: 'Name Required' },
  'plot.nameRequiredMsg': { id: 'Beri nama untuk plot ini.', en: 'Give this plot a name.' },
  'plot.nameEmptyMsg': { id: 'Nama plot tidak boleh kosong.', en: 'Plot name cannot be empty.' },
  'plot.locationPermission': { id: 'Perlu Izin Lokasi', en: 'Location Permission Needed' },
  'plot.locationPermissionMsg': {
    id: 'Aktifkan akses lokasi untuk menandai plot ini dengan koordinat GPS.',
    en: 'Enable location access to tag this plot with GPS coordinates.',
  },
  'plot.couldNotGetLocation': { id: 'Tidak Dapat Mengambil Lokasi', en: 'Could Not Get Location' },
  'plot.couldNotCreate': { id: 'Tidak Dapat Membuat Plot', en: 'Could Not Create Plot' },
  'plot.couldNotSave': { id: 'Tidak Dapat Menyimpan Perubahan', en: 'Could Not Save Changes' },

  'plot.exportTitle': { id: 'Ekspor Data Karbon', en: 'Export Carbon Data' },
  'plot.exportMsg': {
    id: 'Pilih format untuk mengunduh dan membagikan metrik karbon plot:',
    en: 'Select a format to download and share the plot carbon metrics:',
  },
  'plot.exportCsv': { id: 'Ekspor CSV', en: 'Export CSV' },
  'plot.exportExcel': { id: 'Ekspor Excel (.xlsx)', en: 'Export Excel (.xlsx)' },
  'plot.divNone': { id: 'Belum Ada Pohon', en: 'No Trees Yet' },
  'plot.divNoneDesc': {
    id: 'Tambahkan pohon ke plot ini untuk menilai keanekaragaman spesies.',
    en: 'Add trees to this plot to evaluate species biodiversity.',
  },
  'plot.divLow': { id: 'Keanekaragaman Rendah', en: 'Low Diversity' },
  'plot.divLowDesc': {
    id: 'Plot ini punya keanekaragaman spesies rendah, didominasi satu atau sedikit spesies.',
    en: 'This plot has low species diversity, meaning it is dominated by one or a few species.',
  },
  'plot.divMed': { id: 'Keanekaragaman Sedang', en: 'Medium Diversity' },
  'plot.divMedDesc': {
    id: 'Plot ini punya keanekaragaman spesies sedang, menandakan campuran spesies yang sehat.',
    en: 'This plot has moderate species diversity, indicating a healthy mix of species.',
  },
  'plot.divHigh': { id: 'Keanekaragaman Tinggi', en: 'High Diversity' },
  'plot.divHighDesc': {
    id: 'Plot ini punya keanekaragaman spesies tinggi, mencerminkan struktur ekologi yang sangat tangguh.',
    en: 'This plot has high species diversity, reflecting a highly resilient ecological structure.',
  },

  // ── Claim modals ────────────────────────────────────────────────────────
  'claim.addTreeToPlot': { id: 'Tambah Pohon ke Plot', en: 'Add Tree to Plot' },
  'claim.done': { id: 'Selesai', en: 'Done' },
  'claim.couldNotLoadScans': { id: 'Tidak dapat memuat scan.', en: 'Could not load scans.' },
  'claim.noUnclaimed': {
    id: 'Tidak ada scan tak terklaim saat ini.',
    en: 'No unclaimed scans available right now.',
  },
  'claim.claim': { id: 'Klaim', en: 'Claim' },
  'claim.couldNotClaimTree': { id: 'Tidak Dapat Mengklaim Pohon', en: 'Could Not Claim Tree' },
  'claim.couldNotLoadPlots': { id: 'Tidak dapat memuat plot Anda.', en: 'Could not load your plots.' },
  'claim.noPlots': {
    id: 'Anda belum punya plot. Buat dulu dari tab "Plot Saya" di Dasbor.',
    en: 'You don\'t have any plots yet. Create one from the "My Plots" tab on your Dashboard first.',
  },
  'claim.select': { id: 'Pilih', en: 'Select' },
  'claim.couldNotClaimScan': { id: 'Tidak Dapat Mengklaim Scan', en: 'Could Not Claim Scan' },

  // ── Recalibrate ─────────────────────────────────────────────────────────
  'recal.title': { id: 'Kalibrasi Ulang Batang (Foto 2D)', en: 'Recalibrate Trunk (2D Photo)' },
  'recal.save': { id: 'Simpan Kalibrasi', en: 'Save Recalibration' },
  'recal.failed': { id: 'Kalibrasi Ulang Gagal', en: 'Recalibration Failed' },

  // ── Shared ──────────────────────────────────────────────────────────────
  'common.tryAgain': { id: 'Silakan coba lagi.', en: 'Please try again.' },
  'common.wakingUp': {
    id: 'Membangunkan server (server tidur saat tidak dipakai). Percobaan pertama bisa memakan waktu hingga satu menit.',
    en: 'Waking up the server (it sleeps when idle). This can take up to a minute on the first try.',
  },
};

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  t: (key: string, fallback?: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('id');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(LANG_KEY);
        if (saved === 'id' || saved === 'en') setLanguageState(saved);
      } catch {
        // Fall back to the default language; a missing preference isn't fatal.
      }
    })();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    SecureStore.setItemAsync(LANG_KEY, lang).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const entry = translations[key];
      if (!entry) return fallback || key;
      return entry[language] || entry.id || fallback || key;
    },
    [language]
  );

  return (
    <SettingsContext.Provider value={{ language, setLanguage, isSettingsOpen, setIsSettingsOpen, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
