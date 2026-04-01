import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// ============================
// CẤU HÌNH
// ============================
// Local:  k6 run k6-test.js
// K8s:    k6 run -e BASE_URL=http://k6-test-api-svc/api k6-test.js
// Single: k6 run -e BASE_URL=http://localhost:3000/api --scenario smoke_test k6-test.js
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

// ============================
// CUSTOM METRICS
// ============================
const errorRate = new Rate('errors');
const createDuration = new Trend('create_duration', true);
const readDuration = new Trend('read_duration', true);
const updateDuration = new Trend('update_duration', true);
const deleteDuration = new Trend('delete_duration', true);
const crudSuccessCount = new Counter('crud_success_total');

// ============================
// CÁC KỊCH BẢN TEST
// ============================

// Tất cả scenarios được định nghĩa ở đây
const allScenarios = {
  // ---- Kịch bản 1: Smoke Test (kiểm tra cơ bản) ----
  smoke_test: {
    executor: 'constant-vus',
    vus: 5,
    duration: '1m',
    startTime: '0s',
    tags: { test_type: 'smoke' },
  },

  // ---- Kịch bản 2: Load Test (tải bình thường) ----
  load_test: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 }, // Tăng dần lên 50 users
      { duration: '5m', target: 50 }, // Giữ 50 users trong 5 phút
      { duration: '2m', target: 0 }, // Giảm dần về 0
    ],
    startTime: '1m30s',
    tags: { test_type: 'load' },
  },

  // ---- Kịch bản 3: Stress Test (tải cao - test scaling) ----
  stress_test: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '3m', target: 100 },
      { duration: '3m', target: 200 }, // Đẩy lên 200 users
      { duration: '3m', target: 300 }, // Đẩy lên 300 users
      { duration: '2m', target: 0 },
    ],
    startTime: '11m',
    tags: { test_type: 'stress' },
  },

  // ---- Kịch bản 4: Spike Test (đột biến tải) ----
  spike_test: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '10s', target: 500 }, // Spike đột ngột lên 500
      { duration: '1m', target: 500 },
      { duration: '30s', target: 10 },
    ],
    startTime: '25m',
    tags: { test_type: 'spike' },
  },
};

// ============================
// CHỌN SCENARIO
// ============================
// Chạy 1 scenario:  k6 run -e SCENARIO=smoke_test k6-test.js
// Chạy tất cả:      k6 run k6-test.js
const selectedScenario = __ENV.SCENARIO;
const scenariosToRun = selectedScenario
  ? { [selectedScenario]: { ...allScenarios[selectedScenario], startTime: '0s' } }
  : allScenarios;

if (selectedScenario && !allScenarios[selectedScenario]) {
  throw new Error(
    `❌ Scenario "${selectedScenario}" không tồn tại. Các scenario có sẵn: ${Object.keys(allScenarios).join(', ')}`,
  );
}

export const options = {
  scenarios: scenariosToRun,

  // ============================
  // NGƯỠNG CHẤP NHẬN (Thresholds)
  // ============================
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% request < 1s
    errors: ['rate<0.1'], // Tỉ lệ lỗi < 10%
    create_duration: ['p(95)<1500'],
    read_duration: ['p(95)<800'],
    update_duration: ['p(95)<1500'],
    delete_duration: ['p(95)<1200'],
  },
};

// ============================
// HEADERS
// ============================
function getHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };
}

// ============================
// HÀM ĐĂNG NHẬP
// ============================
function login() {
  const payload = JSON.stringify({
    username: 'testuser',
    password: 'testpassword',
  });

  const res = http.post(`${BASE_URL}/auth/login`, payload, getHeaders());

  if (res.status === 200) {
    try {
      return JSON.parse(res.body).token;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// ============================
// HÀM CHÍNH - CRUD FLOW
// ============================
export default function () {
  // Đăng nhập lấy token
  const token = login();

  if (!token) {
    console.error('❌ Login failed');
    errorRate.add(1);
    return;
  }

  let createdId = null;

  // ========== CREATE ==========
  group('CREATE - Tạo resource mới', () => {
    const payload = JSON.stringify({
      title: `Test Item ${Date.now()}-${__VU}`,
      description: `Được tạo bởi VU ${__VU} lúc ${new Date().toISOString()}`,
      status: 'active',
    });

    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/items`, payload, getHeaders(token));
    createDuration.add(Date.now() - startTime);

    const isSuccess = check(res, {
      'CREATE: status 201': (r) => r.status === 201,
      'CREATE: có trả về id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (isSuccess) {
      crudSuccessCount.add(1);
      try {
        const body = JSON.parse(res.body);
        createdId = body.id;
      } catch (e) {
        // parse lỗi
      }
    }

    errorRate.add(!isSuccess);
  });

  sleep(1);

  // ========== READ (Danh sách) ==========
  group('READ - Lấy danh sách', () => {
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/items?page=1&limit=20`, getHeaders(token));
    readDuration.add(Date.now() - startTime);

    const isSuccess = check(res, {
      'READ LIST: status 200': (r) => r.status === 200,
      'READ LIST: trả về mảng dữ liệu': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!isSuccess);
    if (isSuccess) crudSuccessCount.add(1);
  });

  sleep(0.5);

  // ========== READ (Chi tiết) ==========
  if (createdId) {
    group('READ - Lấy chi tiết theo ID', () => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/items/${createdId}`, getHeaders(token));
      readDuration.add(Date.now() - startTime);

      const isSuccess = check(res, {
        'READ DETAIL: status 200': (r) => r.status === 200,
        'READ DETAIL: đúng ID': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.id === createdId;
          } catch {
            return false;
          }
        },
      });

      errorRate.add(!isSuccess);
      if (isSuccess) crudSuccessCount.add(1);
    });

    sleep(0.5);

    // ========== UPDATE ==========
    group('UPDATE - Cập nhật resource', () => {
      const payload = JSON.stringify({
        title: `Updated Item ${Date.now()}-${__VU}`,
        description: `Cập nhật bởi VU ${__VU} lúc ${new Date().toISOString()}`,
        status: 'updated',
      });

      const startTime = Date.now();
      const res = http.put(`${BASE_URL}/items/${createdId}`, payload, getHeaders(token));
      updateDuration.add(Date.now() - startTime);

      const isSuccess = check(res, {
        'UPDATE: status 200': (r) => r.status === 200,
        'UPDATE: dữ liệu đã thay đổi': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.title && body.title.includes('Updated');
          } catch {
            return false;
          }
        },
      });

      errorRate.add(!isSuccess);
      if (isSuccess) crudSuccessCount.add(1);
    });

    sleep(0.5);

    // ========== DELETE ==========
    group('DELETE - Xóa resource', () => {
      const startTime = Date.now();
      const res = http.del(`${BASE_URL}/items/${createdId}`, null, getHeaders(token));
      deleteDuration.add(Date.now() - startTime);

      const isSuccess = check(res, {
        'DELETE: status 204': (r) => r.status === 204,
      });

      errorRate.add(!isSuccess);
      if (isSuccess) crudSuccessCount.add(1);
    });

    sleep(0.5);

    // ========== VERIFY DELETE ==========
    group('VERIFY - Xác nhận đã xóa', () => {
      const res = http.get(`${BASE_URL}/items/${createdId}`, getHeaders(token));

      check(res, {
        'VERIFY DELETE: status 404': (r) => r.status === 404,
      });
    });
  }

  sleep(1);
}

// ============================
// TÓM TẮT KẾT QUẢ
// ============================
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test_info: 'K6 Performance Test - Express API',
    metrics: {
      total_requests: data.metrics.http_reqs?.values?.count || 0,
      avg_response_time: data.metrics.http_req_duration?.values?.avg?.toFixed(2) + 'ms',
      p95_response_time: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) + 'ms',
      p99_response_time: data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) + 'ms',
      error_rate: (data.metrics.errors?.values?.rate * 100)?.toFixed(2) + '%',
      crud_success: data.metrics.crud_success_total?.values?.count || 0,
    },
  };

  console.log('\n========================================');
  console.log('   KẾT QUẢ KIỂM THỬ HIỆU NĂNG');
  console.log('========================================');
  console.log(JSON.stringify(summary, null, 2));

  return {
    'results/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}
