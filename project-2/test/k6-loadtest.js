import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    massive_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 500 },
        { duration: '4m', target: 500 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  discardResponseBodies: true,
  batch: 10,
  maxRedirects: 0,
  noConnectionReuse: false,
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.2'],
    errors: ['rate<0.2'],
    http_reqs: ['rate>10000'],
  },
};

function generateRandomLocation() {
  return {
    truck_id: Math.floor(Math.random() * 500000) + 1,
    latitude: 40.0 + Math.random() * 10.0,
    longitude: -75.0 + Math.random() * 10.0,
    timestamp: Date.now(),
  };
}

const baseUrl = 'http://localhost:8000';
const headers = {
  'Content-Type': 'application/json',
};

export default function () {
  const payload = JSON.stringify(generateRandomLocation());
  
  const params = {
    headers: headers,
    timeout: '10s',
  };

  const response = http.post(`${baseUrl}/api/v1/location/update`, payload, params);
  
  const result = check(response, {
    'got successful response': (r) => r.status === 200,
    'response came back quickly': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!result);

  if (Math.random() < 0.01) {
    const statsResponse = http.get(`${baseUrl}/stats`, { timeout: '5s' });
    check(statsResponse, {
      'stats endpoint is responding': (r) => r.status === 200,
    });
  }

  sleep(0.01);
}