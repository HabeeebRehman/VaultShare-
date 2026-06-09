import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metric: track failed requests across the run.
const errorRate = new Rate("errors");

// Ramp to 1,000+ concurrent virtual users to satisfy Mandate 4.
export const options = {
  stages: [
    { duration: "30s", target: 200 },   // warm up
    { duration: "1m", target: 1000 },   // ramp to 1,000 VUs
    { duration: "2m", target: 1200 },   // sustain above 1,000
    { duration: "30s", target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"], // 95% of requests under 800ms
    errors: ["rate<0.01"],            // <1% errors
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:4000";

// A tiny pre-made ciphertext blob (base64). The load test exercises the
// store/read path without doing real crypto — the server only sees ciphertext.
const SAMPLE_CIPHERTEXT = "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5";

export default function () {
  // 1) Create a secret
  const createRes = http.post(
    `${BASE}/api/secrets`,
    JSON.stringify({
      ciphertext: SAMPLE_CIPHERTEXT,
      expiry: "1h",
      label: "loadtest",
      maxViews: 1,
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  const created = check(createRes, {
    "create status 201": (r) => r.status === 201,
  });
  errorRate.add(!created);

  // 2) Consume it (burns the secret)
  if (createRes.status === 201) {
    const id = createRes.json("id");
    const consumeRes = http.post(`${BASE}/api/secrets/${id}/consume`);
    const consumed = check(consumeRes, {
      "consume status 200": (r) => r.status === 200,
    });
    errorRate.add(!consumed);
  }

  sleep(1);
}
