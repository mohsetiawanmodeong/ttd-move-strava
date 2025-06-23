# 🚀 Panduan Setup Lengkap Strava API

## 📋 Yang Diperlukan
- Akun Strava
- Akses ke club Strava
- Node.js (sudah terinstall)

## 🔑 Langkah 1: Buat Strava API Application

### 1.1 Kunjungi Strava API Settings
- Buka: https://www.strava.com/settings/api
- Login ke akun Strava Anda

### 1.2 Buat Aplikasi Baru
- Klik **"Create Application"**
- Isi form dengan detail berikut:
  ```
  Application Name: Virtual Run Leaderboard
  Category: Analytics
  Website: http://localhost
  Application Description: Aplikasi untuk menampilkan klasemen virtual run club
  ```

### 1.3 Catat Kredensial
Setelah aplikasi dibuat, catat:
- **Client ID** (contoh: `12345`)
- **Client Secret** (contoh: `abcdef123456789...`)

## 🔐 Langkah 2: Dapatkan Authorization Code

### 2.1 Buka URL Authorization
Ganti `YOUR_CLIENT_ID` dengan Client ID Anda:
```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=read,activity:read_all
```

### 2.2 Authorize Aplikasi
- Login ke Strava jika belum
- Klik **"Authorize"** untuk memberikan izin
- Pastikan scope yang dipilih: `read` dan `activity:read_all`

### 2.3 Catat Authorization Code
- Browser akan redirect ke: `http://localhost?state=&code=AUTHORIZATION_CODE`
- Catat kode yang muncul setelah `code=`
- Contoh: `http://localhost?state=&code=abc123def456` → Authorization Code = `abc123def456`

## 🔄 Langkah 3: Dapatkan Access Token dan Refresh Token

### 3.1 Jalankan Script Helper
```bash
node get-strava-token.js
```

### 3.2 Masukkan Kredensial
Script akan meminta:
- **Client ID**: Masukkan Client ID dari langkah 1
- **Client Secret**: Masukkan Client Secret dari langkah 1  
- **Authorization Code**: Masukkan kode dari langkah 2

### 3.3 Catat Refresh Token
Script akan menampilkan:
```
✅ Token berhasil didapatkan!

📋 Salin kredensial berikut ke file .env:

STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=abcdef123456789...
STRAVA_REFRESH_TOKEN=xyz789abc123...
```

## 🏃‍♂️ Langkah 4: Dapatkan Club ID

### 4.1 Buka Strava Web
- Kunjungi: https://www.strava.com
- Login ke akun Anda

### 4.2 Cari Club
- Klik menu **"Clubs"** di sidebar kiri
- Atau ketik nama club di search bar
- Klik pada club yang ingin digunakan

### 4.3 Catat Club ID
- Lihat URL di browser
- Format: `https://www.strava.com/clubs/CLUB_ID`
- Contoh: `https://www.strava.com/clubs/123456` → Club ID = `123456`

## 📝 Langkah 5: Buat File .env

### 5.1 Buat File .env
```bash
cp env.example .env
```

### 5.2 Isi Kredensial
Edit file `.env` dan isi dengan kredensial yang sudah didapat:

```env
# Strava API Configuration
STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=abcdef123456789...
STRAVA_REFRESH_TOKEN=xyz789abc123...

# Club Configuration
STRAVA_CLUB_ID=123456

# Server Configuration
PORT=3000
```

## ✅ Langkah 6: Test Aplikasi

### 6.1 Jalankan Aplikasi
```bash
npm run dev
```

### 6.2 Buka Browser
- Kunjungi: http://localhost:3000
- Aplikasi akan otomatis memuat data dari Strava

### 6.3 Test API Endpoints
- Health check: http://localhost:3000/api/health
- Leaderboard: http://localhost:3000/api/leaderboard

## 🛠️ Troubleshooting

### Error: "Invalid client_id"
- Periksa Client ID di file `.env`
- Pastikan aplikasi Strava sudah dibuat dengan benar

### Error: "Invalid authorization code"
- Authorization code hanya berlaku sekali
- Dapatkan authorization code baru

### Error: "Club not found"
- Periksa Club ID di file `.env`
- Pastikan Anda adalah member dari club tersebut

### Error: "No activities found"
- Periksa periode event di `server.js`
- Pastikan ada aktivitas virtual run dalam periode tersebut

## 🔒 Keamanan

- **Jangan commit file `.env`** ke repository
- **Refresh token** akan otomatis diperbarui oleh aplikasi
- **Access token** memiliki masa berlaku 6 jam

## 📞 Bantuan

Jika mengalami masalah:
1. Periksa console browser (F12)
2. Periksa terminal untuk error messages
3. Pastikan semua kredensial sudah benar
4. Cek koneksi internet

---

**Selamat! Aplikasi Virtual Run Leaderboard siap digunakan! 🏃‍♂️💨** 