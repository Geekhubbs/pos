const http = require('http');

const data = JSON.stringify({
  name: 'Test Customer',
  phone: '123456',
  email: 'test@test.com',
  address: '123 Main',
  loyalty_points: 0
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/customers',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
