import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const listLatency = new Trend('list_latency', true);
const singleLatency = new Trend('single_latency', true);

// Config via environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_KEY = __ENV.API_KEY || 'yTsMLKOvAAkrIfyqVNFFsMPpRJmUhVNXqsYUrHrvxxwJSwDDciEndVWoIaAvKtIL';

const headers = {
	'x-api-key': API_KEY,
	'Content-Type': 'application/json'
};

// Ramp up to 50 users, sustain for 60s (~10k+ requests)
export const options = {
	stages: [
		{ duration: '10s', target: 50 }, // Ramp up gradually
		{ duration: '60s', target: 50 }, // Sustain for 60s
		{ duration: '5s', target: 0 } // Ramp down
	],
	thresholds: {
		http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
		errors: ['rate<0.1'] // Less than 10% errors
	}
};

const DOC_ID = '6e211999-0118-4e91-8786-1110c8521e8d';

export default function () {
	// Test 1: List published pages
	const listRes = http.get(
		`${BASE_URL}/api/documents?type=page&perspective=published&pageSize=20`,
		{ headers, tags: { endpoint: 'list' } }
	);
	check(listRes, {
		'list: status 200': (r) => r.status === 200,
		'list: has data': (r) => {
			try {
				return JSON.parse(r.body).success === true;
			} catch {
				return false;
			}
		}
	});
	listLatency.add(listRes.timings.duration);
	errorRate.add(listRes.status !== 200);

	// Test 2: Single document by ID
	const singleRes = http.get(`${BASE_URL}/api/documents/${DOC_ID}?perspective=published`, {
		headers,
		tags: { endpoint: 'single' }
	});
	check(singleRes, {
		'single: status 200': (r) => r.status === 200
	});
	singleLatency.add(singleRes.timings.duration);
	errorRate.add(singleRes.status !== 200);

	// Small pause between iterations to simulate real users
	sleep(0.1);
}
