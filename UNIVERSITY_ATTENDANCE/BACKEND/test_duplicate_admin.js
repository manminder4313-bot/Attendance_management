
async function testDuplicateAdmin() {
  const url = 'http://localhost:5000/api/admins';
  const data = {
    id: 'testadmin1777357625470',
    fullName: 'Test Admin',
    email: 'test1777357625470@example.com',
    password: 'password123',
    contact: '1234567890'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Result:', result);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testDuplicateAdmin();
