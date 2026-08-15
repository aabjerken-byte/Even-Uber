import http from 'http';

let currentRide = null;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/ride-update') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      currentRide = JSON.parse(body);
      console.log('✅ Received ride update:', currentRide.driverName);
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'success', message: 'Ride data updated' }));
    });
  } else if (req.method === 'GET' && req.url === '/api/ride') {
    if (currentRide) {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'success', data: currentRide }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ status: 'no_data', message: 'No active ride' }));
    }
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(3001, () => {
  console.log('🚀 Mock API server running on http://127.0.0.1:3001');
});