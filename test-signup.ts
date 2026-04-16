async function test() {
  try {
    const response = await fetch('http://localhost:3000/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Admin User', email: 'admin@example.com', password: 'password123' }),
    });
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Body:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
