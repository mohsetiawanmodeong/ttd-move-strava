const readline = require('readline');
const axios = require('axios');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function getStravaTokens() {
    console.log('🚀 Strava Token Generator\n');
    console.log('Langkah 1: Buat aplikasi di https://www.strava.com/settings/api');
    console.log('Langkah 2: Dapatkan authorization code dari URL:\n');
    
    const clientId = await question('Masukkan Client ID: ');
    const clientSecret = await question('Masukkan Client Secret: ');
    const authCode = await question('Masukkan Authorization Code: ');
    
    console.log('\n🔄 Mendapatkan token...\n');
    
    try {
        const response = await axios.post('https://www.strava.com/oauth/token', {
            client_id: clientId,
            client_secret: clientSecret,
            code: authCode,
            grant_type: 'authorization_code'
        });
        
        const data = response.data;
        
        console.log('✅ Token berhasil didapatkan!\n');
        console.log('📋 Salin kredensial berikut ke file .env:\n');
        console.log(`STRAVA_CLIENT_ID=${clientId}`);
        console.log(`STRAVA_CLIENT_SECRET=${clientSecret}`);
        console.log(`STRAVA_REFRESH_TOKEN=${data.refresh_token}`);
        console.log('\n⚠️  Catatan: Access token akan otomatis diperbarui oleh aplikasi');
        console.log('\n📝 Response lengkap:');
        console.log(JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('❌ Error mendapatkan token:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
    
    rl.close();
}

getStravaTokens(); 