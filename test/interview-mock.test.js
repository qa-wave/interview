const assert = require('node:assert/strict');
const { test, describe, before, after } = require('node:test');
const app = require('../server');

let server;
let baseUrl;

const BEARER = { authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.CEPS-HUB-INTERVIEW-2026' };

function soapEnvelope(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="urn:interview-mock"
               xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soap:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>ceps-integration</wsse:Username>
        <wsse:Password>K7x!mQ9pL2wZ</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;
}

function soapPost(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'text/xml; charset=utf-8' },
    body: soapEnvelope(body)
  });
}

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

// --- Public endpoints (no auth) ---

describe('Public endpoints', () => {
  test('healthcheck', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.deepEqual(body.protocols, ['REST', 'SOAP']);
  });

  test('openapi.yaml', async () => {
    const res = await fetch(`${baseUrl}/openapi.yaml`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /openapi: 3\.0/);
  });

  test('WSDL', async () => {
    const res = await fetch(`${baseUrl}/soap?wsdl`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /InterviewMockService/);
  });
});

// --- REST Bearer auth ---

describe('REST: Bearer token auth', () => {
  test('rejects request without Authorization header', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.error, 'UNAUTHORIZED');
  });

  test('rejects non-Bearer scheme', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, {
      headers: { authorization: 'Basic dXNlcjpwYXNz' }
    });
    assert.equal(res.status, 401);
  });

  test('rejects invalid token', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, {
      headers: { authorization: 'Bearer wrong-token' }
    });
    assert.equal(res.status, 401);
  });

  test('accepts valid Bearer token', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, { headers: BEARER });
    assert.equal(res.status, 200);
  });
});

// --- SOAP WS-Security auth ---

describe('SOAP: WS-Security UsernameToken', () => {
  test('rejects request without Security header', async () => {
    const res = await fetch(`${baseUrl}/soap`, {
      method: 'POST',
      headers: { 'content-type': 'text/xml; charset=utf-8' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:interview-mock">
  <soap:Body><tns:ListInterviewsRequest/></soap:Body>
</soap:Envelope>`
    });
    assert.equal(res.status, 401);
    const text = await res.text();
    assert.match(text, /AUTHENTICATION_REQUIRED/);
  });

  test('rejects wrong credentials', async () => {
    const res = await fetch(`${baseUrl}/soap`, {
      method: 'POST',
      headers: { 'content-type': 'text/xml; charset=utf-8' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="urn:interview-mock"
               xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soap:Header><wsse:Security><wsse:UsernameToken>
    <wsse:Username>wrong</wsse:Username><wsse:Password>wrong</wsse:Password>
  </wsse:UsernameToken></wsse:Security></soap:Header>
  <soap:Body><tns:ListInterviewsRequest/></soap:Body>
</soap:Envelope>`
    });
    assert.equal(res.status, 401);
    assert.match(await res.text(), /INVALID_CREDENTIALS/);
  });

  test('accepts valid WS-Security credentials', async () => {
    const res = await soapPost(`${baseUrl}/soap`, '<tns:ListInterviewsRequest/>');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /ListInterviewsResponse/);
  });
});

// --- REST CRUD ---

describe('REST: interviews CRUD', () => {
  test('list interviews', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, { headers: BEARER });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.interviews.length >= 2);
    for (const i of body.interviews) {
      assert.ok(i.candidate, 'must embed candidate');
    }
  });

  test('filter by status', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews?status=SCHEDULED`, { headers: BEARER });
    const body = await res.json();
    for (const i of body.interviews) assert.equal(i.status, 'SCHEDULED');
  });

  test('get interview detail', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-001`, { headers: BEARER });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.interview.candidate.firstName, 'Anna');
  });

  test('get candidate', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates/CAND-001`, { headers: BEARER });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.candidate.email, 'anna.novak@example.test');
  });

  test('search candidates by email', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates?email=petr.svoboda@example.test`, { headers: BEARER });
    const body = await res.json();
    assert.equal(body.candidates.length, 1);
    assert.equal(body.candidates[0].id, 'CAND-002');
  });

  test('search candidates by skill', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates?skill=SOAP`, { headers: BEARER });
    const body = await res.json();
    assert.equal(body.candidates.length, 1);
    assert.equal(body.candidates[0].id, 'CAND-002');
  });
});

describe('REST: interview lifecycle', () => {
  let interviewId;

  test('create → status change → evaluate', async () => {
    // Create
    const c = await fetch(`${baseUrl}/rest/interviews`, {
      method: 'POST',
      headers: { ...BEARER, 'content-type': 'application/json' },
      body: JSON.stringify({ candidateId: 'CAND-002', position: 'Integration Tester', scheduledAt: '2026-06-01T10:00:00.000Z' })
    });
    const cb = await c.json();
    assert.equal(c.status, 201);
    interviewId = cb.interview.id;

    // Status change
    const s = await fetch(`${baseUrl}/rest/interviews/${interviewId}/status`, {
      method: 'PATCH',
      headers: { ...BEARER, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' })
    });
    assert.equal(s.status, 200);

    // Evaluate
    const e = await fetch(`${baseUrl}/rest/interviews/${interviewId}/evaluate`, {
      method: 'POST',
      headers: { ...BEARER, 'content-type': 'application/json' },
      body: JSON.stringify({ score: 82 })
    });
    const eb = await e.json();
    assert.equal(e.status, 200);
    assert.equal(eb.interview.status, 'COMPLETED');
    assert.equal(eb.interview.recommendation, 'HIRE');
  });

  test('created interview visible in list', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, { headers: BEARER });
    const body = await res.json();
    assert.ok(body.interviews.some((i) => i.id === interviewId));
  });
});

// --- REST error handling ---

describe('REST: errors', () => {
  test('nonexistent interview → 404', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-999`, { headers: BEARER });
    assert.equal(res.status, 404);
  });

  test('unknown candidate → 400', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, {
      method: 'POST',
      headers: { ...BEARER, 'content-type': 'application/json' },
      body: JSON.stringify({ candidateId: 'CAND-999' })
    });
    assert.equal(res.status, 400);
  });

  test('invalid score → 400', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-001/evaluate`, {
      method: 'POST',
      headers: { ...BEARER, 'content-type': 'application/json' },
      body: JSON.stringify({ score: 150 })
    });
    assert.equal(res.status, 400);
  });

  test('invalid status → 400', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-001/status`, {
      method: 'PATCH',
      headers: { ...BEARER, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'INVALID' })
    });
    assert.equal(res.status, 400);
  });
});

// --- SOAP operations ---

describe('SOAP: operations', () => {
  test('ListInterviews', async () => {
    const res = await soapPost(`${baseUrl}/soap`, '<tns:ListInterviewsRequest/>');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /ListInterviewsResponse/);
  });

  test('GetInterview', async () => {
    const res = await soapPost(`${baseUrl}/soap`, '<tns:GetInterviewRequest><tns:id>INT-002</tns:id></tns:GetInterviewRequest>');
    const text = await res.text();
    assert.equal(res.status, 200);
    assert.match(text, /82/);
    assert.match(text, /HIRE/);
  });

  test('CreateInterview', async () => {
    const res = await soapPost(`${baseUrl}/soap`, `
      <tns:CreateInterviewRequest>
        <tns:candidateId>CAND-001</tns:candidateId>
        <tns:position>SOAP Tester</tns:position>
      </tns:CreateInterviewRequest>`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /CreateInterviewResponse/);
  });

  test('UpdateInterviewStatus', async () => {
    const res = await soapPost(`${baseUrl}/soap`, `
      <tns:UpdateInterviewStatusRequest>
        <tns:id>INT-001</tns:id>
        <tns:status>IN_PROGRESS</tns:status>
      </tns:UpdateInterviewStatusRequest>`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /IN_PROGRESS/);
  });

  test('nonexistent interview → Fault', async () => {
    const res = await soapPost(`${baseUrl}/soap`, '<tns:GetInterviewRequest><tns:id>INT-999</tns:id></tns:GetInterviewRequest>');
    assert.equal(res.status, 404);
    assert.match(await res.text(), /Fault/);
  });
});

// --- Cross-protocol ---

describe('Cross-protocol: shared state', () => {
  test('SOAP-created interview visible via REST', async () => {
    const soapRes = await soapPost(`${baseUrl}/soap`, `
      <tns:CreateInterviewRequest>
        <tns:candidateId>CAND-002</tns:candidateId>
        <tns:position>Cross-Protocol</tns:position>
      </tns:CreateInterviewRequest>`);
    const text = await soapRes.text();
    const id = text.match(/<id>(INT-\d{3})<\/id>/)?.[1];
    assert.ok(id);

    const restRes = await fetch(`${baseUrl}/rest/interviews/${id}`, { headers: BEARER });
    const body = await restRes.json();
    assert.equal(restRes.status, 200);
    assert.equal(body.interview.position, 'Cross-Protocol');
  });
});
