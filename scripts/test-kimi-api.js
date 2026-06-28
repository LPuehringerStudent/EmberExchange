require('dotenv').config();

async function test() {
  const url = (process.env.KIMI_BASE_URL || 'https://api.moonshot.ai/v1').replace(/\/$/, '');
  const model = process.env.KIMI_MODEL || 'kimi-k2.6';
  const key = process.env.KIMI_API_KEY;

  if (!key) {
    console.error('KIMI_API_KEY is empty');
    process.exit(1);
  }

  console.log('Endpoint:', url);
  console.log('Model:', model);

  try {
    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    const body = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', body.slice(0, 800));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

test();
