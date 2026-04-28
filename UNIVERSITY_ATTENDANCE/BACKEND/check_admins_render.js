
async function checkAdmins() {
  const url = 'https://attendance-management-efde.onrender.com/api/admins';
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text.substring(0, 200)}`);
  } catch (err) {
    console.error('Failed:', err.message);
  }
}
checkAdmins();
