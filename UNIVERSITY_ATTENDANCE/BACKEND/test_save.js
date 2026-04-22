

async function testSave() {
  const teacher = {
    fullName: "Demo Teacher",
    email: "demo@mrsptu.ac.in",
    password: "password123",
    department: "Computer Science",
    primarySubject: "Data Structures",
    username: "demo1234"
  };

  try {
    const response = await fetch('https://attendance-management-backend-do1l.onrender.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacher)
    });
    const data = await response.json();
    console.log('✅ Save Success:', data);
  } catch (err) {
    console.error('❌ Save Failed:', err);
  }
}

testSave();
