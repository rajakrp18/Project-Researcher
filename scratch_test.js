const http = require('http');

const data = JSON.stringify({
  name: 'purshottam varshneya',
  address: 'e 862 saraswati vihar pitampura delhi'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/investigate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log(JSON.parse(body));
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
