// Verify live production URL
import https from 'https';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function verify() {
  console.log('Testing live production URL: https://medibridge-ai-gules.vercel.app');

  const home = await get('https://medibridge-ai-gules.vercel.app');
  console.log(`[1] Home page status: ${home.status} (Length: ${home.body.length} bytes)`);

  const pat = await get('https://medibridge-ai-gules.vercel.app/api/patients?patientId=MB-2026-ARV982');
  console.log(`[2] Live Patient API status: ${pat.status}`);
  try {
    const pJson = JSON.parse(pat.body);
    console.log(`    Patient Name: ${pJson.patient?.fullName || pJson.data?.fullName}, ID: ${pJson.patient?.patientId || pJson.data?.patientId}`);
  } catch {
    console.log('    Raw response:', pat.body.slice(0, 100));
  }

  const hosp = await get('https://medibridge-ai-gules.vercel.app/api/hospitals?hospitalId=HOSP-2026-PUNE01');
  console.log(`[3] Live Hospital API status: ${hosp.status}`);
  try {
    const hJson = JSON.parse(hosp.body);
    console.log(`    Hospital Name: ${hJson.hospital?.name || hJson.hospital?.hospitalName || hJson.data?.name}`);
  } catch {
    console.log('    Raw response:', hosp.body.slice(0, 100));
  }

  console.log('🎉 Production Verification Complete!');
}

verify().catch(console.error);
