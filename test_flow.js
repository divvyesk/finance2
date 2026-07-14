const http = require('http');

async function runTest() {
  const uniqueEmail = `test_${Date.now()}@example.com`;
  const emailWithSpaces = `  ${uniqueEmail}  `;
  
  console.log(`Testing signup with: "${emailWithSpaces}"`);
  const signupRes = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E Test', email: emailWithSpaces, password: 'password123' })
  });
  
  console.log('Signup status:', signupRes.status);
  const signupCookies = signupRes.headers.get('set-cookie');
  console.log('Signup set-cookie:', signupCookies);
  
  console.log('Testing me...');
  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    method: 'GET',
    headers: signupCookies ? { 'Cookie': signupCookies } : {}
  });
  console.log('Me status:', meRes.status);
  console.log('Me body:', await meRes.text());
  
  console.log(`Testing login with trimmed email: "${uniqueEmail}"`);
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password: 'password123' })
  });
  console.log('Login status:', loginRes.status);
  console.log('Login body:', await loginRes.text());
}

runTest().catch(console.error);
