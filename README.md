# 🏃‍♂️ Virtual Run Leaderboard - Strava Club

Aplikasi web untuk menampilkan klasemen event virtual run dari Strava club dengan periode 7 Juni - 6 Juli 2025.

## ✨ Fitur

- 📊 **Klasemen Real-time**: Menampilkan ranking berdasarkan total jarak tempuh
- 🏆 **Highlight Pemenang**: Peringkat 1-3 dengan warna khusus (emas, perak, perunggu)
- 📈 **Statistik Event**: Total atlet, aktivitas, dan jarak tempuh
- 📱 **Responsive Design**: Tampilan yang optimal di desktop dan mobile
- 🔄 **Auto Refresh**: Tombol untuk memperbarui data secara manual
- 🎨 **Modern UI**: Interface yang menarik dengan gradient dan animasi

## 🚀 Instalasi

### 1. Clone Repository
```bash
git clone <repository-url>
cd ttd-move-2025
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment Variables

Buat file `.env` berdasarkan `env.example`:

```bash
cp env.example .env
```

Isi file `.env` dengan kredensial Strava API Anda:

```env
# Strava API Configuration
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REFRESH_TOKEN=your_strava_refresh_token

# Club Configuration
STRAVA_CLUB_ID=your_club_id

# Server Configuration
PORT=3000
```

### 4. Setup Strava API

#### Langkah 1: Buat Strava API Application
1. Kunjungi [Strava API Settings](https://www.strava.com/settings/api)
2. Buat aplikasi baru dengan nama "Virtual Run Leaderboard"
3. Catat `Client ID` dan `Client Secret`

#### Langkah 2: Dapatkan Authorization Code
1. Buka URL berikut di browser (ganti `YOUR_CLIENT_ID`):
```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=read,activity:read_all
```

2. Authorize aplikasi dan catat `code` dari URL redirect

#### Langkah 3: Dapatkan Access Token dan Refresh Token
```bash
curl -X POST https://www.strava.com/oauth/token \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F code=AUTHORIZATION_CODE \
  -F grant_type=authorization_code
```

#### Langkah 4: Dapatkan Club ID
1. Buka Strava web
2. Kunjungi halaman club Anda
3. Catat ID dari URL: `https://www.strava.com/clubs/CLUB_ID`

### 5. Jalankan Aplikasi

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

## 📋 Struktur Aplikasi

```
ttd-move-2025/
├── server.js              # Server Express.js utama
├── package.json           # Dependencies dan scripts
├── env.example           # Template environment variables
├── .env                  # Environment variables (buat sendiri)
├── README.md             # Dokumentasi
└── public/
    └── index.html        # Interface web
```

## 🔧 Konfigurasi

### Periode Event
Periode event dapat diubah di `server.js`:

```javascript
const EVENT_START_DATE = '2025-06-07';
const EVENT_END_DATE = '2025-07-06';
```

### Filter Aktivitas
Aplikasi akan memfilter aktivitas berdasarkan:
- **Tipe**: Hanya aktivitas lari (Run)
- **Virtual**: Aktivitas yang dilakukan di trainer atau mengandung kata "virtual"
- **Periode**: Aktivitas dalam rentang tanggal event

## 📊 API Endpoints

### GET `/api/leaderboard`
Mengambil data klasemen virtual run.

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "id": 12345,
        "name": "John Doe",
        "totalDistance": 50000,
        "totalTime": 7200,
        "activities": 5,
        "averagePace": 0.144,
        "totalDistanceKm": 50.0,
        "totalTimeHours": 2.0
      }
    ],
    "eventPeriod": {
      "start": "2025-06-07",
      "end": "2025-07-06"
    },
    "totalActivities": 25,
    "lastUpdated": "2025-01-15T10:30:00.000Z"
  }
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "eventPeriod": {
    "start": "2025-06-07",
    "end": "2025-07-06"
  }
}
```

## 🎯 Cara Kerja

1. **Authentication**: Aplikasi menggunakan OAuth 2.0 untuk mengakses Strava API
2. **Data Fetching**: Mengambil aktivitas club dari Strava API
3. **Filtering**: Memfilter aktivitas berdasarkan kriteria virtual run
4. **Calculation**: Menghitung total jarak, waktu, dan pace rata-rata
5. **Ranking**: Mengurutkan berdasarkan total jarak (descending)
6. **Display**: Menampilkan klasemen dengan UI yang menarik

## 🛠️ Troubleshooting

### Error: "Invalid access token"
- Pastikan refresh token masih valid
- Regenerate access token jika diperlukan

### Error: "Club not found"
- Periksa `STRAVA_CLUB_ID` di file `.env`
- Pastikan Anda adalah member dari club tersebut

### Error: "No activities found"
- Periksa periode event di `server.js`
- Pastikan ada aktivitas virtual run dalam periode tersebut

### Error: "Rate limit exceeded"
- Strava API memiliki limit 1000 requests per 15 menit
- Tunggu beberapa menit sebelum mencoba lagi

## 🔒 Keamanan

- Jangan commit file `.env` ke repository
- Gunakan environment variables untuk kredensial
- Refresh token akan otomatis diperbarui saat expired

## 📝 Lisensi

MIT License - bebas digunakan untuk keperluan komersial maupun non-komersial.

## 🤝 Kontribusi

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📞 Support

Jika mengalami masalah atau ada pertanyaan, silakan buat issue di repository ini.

---

**Happy Running! 🏃‍♂️💨** 