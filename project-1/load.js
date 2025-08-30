import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: "2m", target: 10000 },  // ramp up to 7000 users in 2 minutes
    { duration: "10m", target: 10000 }, // stay at 7000 users for 10 minutes
    { duration: "2m", target: 0 },     // ramp down to 0
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],    // less than 1% errors
    http_req_duration: ["p(95)<2000"], // 95% under 2s
  },
};

export default function () {
  const driverId = Math.floor(Math.random() * 100) + 1;
  const res = http.get(
    `http://localhost:5002/api/v1/drivers/${driverId}/analytics`
  );
  
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response body not empty": (r) => r.body.length > 0,
  });

  sleep(1);
}
