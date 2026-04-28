


async function listAdmins() {
  const url = 'http://localhost:5000/api/admins';
  try {
    const response = await fetch(url);
    const result = await response.json();
    console.log('Admins:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

listAdmins();
