
async function checkRenderSite() {
  const baseUrl = 'https://attendance-management-efde.onrender.com/api';
  const endpoints = ['/health', '/status', '/ping'];
  
  for (const ep of endpoints) {
    try {
      const url = baseUrl + ep;
      console.log(`📡 Checking ${url}...`);
      const res = await fetch(url);
      const text = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Response: ${text.substring(0, 100)}...`);
    } catch (err) {
      console.error(`Failed to check ${ep}:`, err.message);
    }
  }
}

checkRenderSite();
