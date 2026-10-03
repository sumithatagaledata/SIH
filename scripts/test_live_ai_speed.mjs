// Test Live AI Intake Response Speed
import https from 'https';

function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = JSON.stringify(data);
    const start = Date.now();
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const elapsed = Date.now() - start;
          resolve({ status: res.statusCode, body, elapsed });
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testSpeed() {
  console.log('Testing live AI Intake response latency...');
  const res = await post('https://medibridge-ai-gules.vercel.app/api/ai-intake', {
    action: 'chat',
    currentMessage: 'I have severe headache and fever for 2 days',
    messages: [
      { sender: 'AI_CLINICAL_INTAKE', text: 'Hello, how can I help you today?' },
      { sender: 'PATIENT', text: 'I have severe headache and fever for 2 days' }
    ],
    language: 'en',
    medicalSystem: 'ALLOPATHY',
    isRedFlagDetectionEnabled: true
  });

  console.log(`[Speed Test] Status: ${res.status}, Elapsed Time: ${res.elapsed} ms`);
  try {
    const json = JSON.parse(res.body);
    console.log(`[AI Response]:`, json.nextBotMessage?.slice(0, 100) + '...');
    console.log(`[Medicines Recommended]:`, json.medicineRecommendations?.map(m => m.name).join(', ') || 'None');
    console.log(`[Triage Priority]:`, json.suggestedTriagePriority);
  } catch (err) {
    console.log('Raw body:', res.body.slice(0, 150));
  }
}

testSpeed().catch(console.error);
