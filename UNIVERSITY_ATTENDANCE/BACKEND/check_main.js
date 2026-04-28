
async function checkMainPage() {
  const url = 'https://attendance-management-efde.onrender.com/';
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response Head: ${text.substring(0, 500)}`);
  } catch (err) {
    console.error('Failed:', err.message);
  }
}
checkMainPage();
