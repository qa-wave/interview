const assert = require('node:assert/strict');
const { test, describe, before, after } = require('node:test');
const app = require('../server');

let server;
let baseUrl;

const ADMIN_HEADERS = { 'x-api-key': 'interview-key-2026' };
const READER_HEADERS = { 'x-api-key': 'readonly-key-2026' };

function soapEnvelope(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:interview-mock">
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;
}

function soapPost(url, body, extraHeaders = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { ...ADMIN_HEADERS, 'content-type': 'text/xml; charset=utf-8', ...extraHeaders },
    body: soapEnvelope(body)
  });
}

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

// ---------------------------------------------------------------------------
// Auth & Security
// ---------------------------------------------------------------------------

describe('Auth: public endpoints', () => {
  test('healthcheck works without API key', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'interview-mock');
    assert.ok(body.timestamp);
    assert.deepEqual(body.protocols, ['REST', 'SOAP']);
    assert.equal(typeof body.counts.interviews, 'number');
    assert.equal(typeof body.counts.candidates, 'number');
  });

  test('root endpoint works without API key', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
  });

  test('openapi.yaml works without API key', async () => {
    const res = await fetch(`${baseUrl}/openapi.yaml`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /openapi: 3\.0/);
  });

  test('REST catalog works without API key', async () => {
    const res = await fetch(`${baseUrl}/rest`);
    assert.equal(res.status, 200);
  });

  test('SOAP WSDL works without API key', async () => {
    const res = await fetch(`${baseUrl}/soap?wsdl`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /InterviewMockService/);
    assert.match(text, /soap:address/);
  });
});

describe('Auth: missing or invalid key', () => {
  test('REST rejects request without API key', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.error, 'UNAUTHORIZED');
    assert.match(body.message, /Missing/);
  });

  test('REST rejects invalid API key', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, {
      headers: { 'x-api-key': 'wrong-key' }
    });
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.error, 'UNAUTHORIZED');
    assert.match(body.message, /Invalid/);
  });

  test('SOAP POST rejects request without API key', async () => {
    const res = await fetch(`${baseUrl}/soap`, {
      method: 'POST',
      headers: { 'content-type': 'text/xml; charset=utf-8' },
      body: soapEnvelope('<tns:ListInterviewsRequest/>')
    });
    assert.equal(res.status, 401);
  });

  test('SOAP POST rejects invalid API key', async () => {
    const res = await fetch(`${baseUrl}/soap`, {
      method: 'POST',
      headers: { 'x-api-key': 'bad', 'content-type': 'text/xml; charset=utf-8' },
      body: soapEnvelope('<tns:ListInterviewsRequest/>')
    });
    assert.equal(res.status, 401);
  });
});

describe('Auth: role-based access', () => {
  test('admin key can read interviews', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, { headers: ADMIN_HEADERS });
    assert.equal(res.status, 200);
  });

  test('reader key can read interviews', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, { headers: READER_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.interviews.length >= 2);
  });

  test('reader key cannot POST (create interview)', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, {
      method: 'POST',
      headers: { ...READER_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ candidateId: 'CAND-001' })
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.error, 'FORBIDDEN');
  });

  test('reader key cannot PATCH (update status)', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-001/status`, {
      method: 'PATCH',
      headers: { ...READER_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' })
    });
    assert.equal(res.status, 403);
  });

  test('reader key cannot POST (evaluate)', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-001/evaluate`, {
      method: 'POST',
      headers: { ...READER_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ score: 50 })
    });
    assert.equal(res.status, 403);
  });

  test('reader key cannot SOAP POST', async () => {
    const res = await fetch(`${baseUrl}/soap`, {
      method: 'POST',
      headers: { ...READER_HEADERS, 'content-type': 'text/xml; charset=utf-8' },
      body: soapEnvelope('<tns:CreateInterviewRequest><tns:candidateId>CAND-001</tns:candidateId></tns:CreateInterviewRequest>')
    });
    assert.equal(res.status, 403);
  });
});

// ---------------------------------------------------------------------------
// REST: CRUD & Filtering
// ---------------------------------------------------------------------------

describe('REST: list and filter interviews', () => {
  test('list all interviews', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body.interviews));
    assert.ok(body.interviews.length >= 2);
    // each interview must have embedded candidate
    for (const interview of body.interviews) {
      assert.ok(interview.id);
      assert.ok(interview.status);
      assert.ok(interview.candidate);
    }
  });

  test('filter by status=SCHEDULED', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews?status=SCHEDULED`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    for (const interview of body.interviews) {
      assert.equal(interview.status, 'SCHEDULED');
    }
  });

  test('filter by status=COMPLETED', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews?status=COMPLETED`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    for (const interview of body.interviews) {
      assert.equal(interview.status, 'COMPLETED');
    }
  });

  test('filter by candidateId', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews?candidateId=CAND-001`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    for (const interview of body.interviews) {
      assert.equal(interview.candidateId, 'CAND-001');
    }
  });

  test('filter by status and candidateId combined', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews?status=COMPLETED&candidateId=CAND-002`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    for (const interview of body.interviews) {
      assert.equal(interview.status, 'COMPLETED');
      assert.equal(interview.candidateId, 'CAND-002');
    }
  });
});

describe('REST: interview detail', () => {
  test('get interview INT-001 with candidate data', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-001`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.interview.id, 'INT-001');
    assert.equal(body.interview.candidate.id, 'CAND-001');
    assert.equal(body.interview.candidate.firstName, 'Anna');
    assert.equal(body.interview.candidate.lastName, 'Novak');
    assert.deepEqual(body.interview.candidate.skills, ['JavaScript', 'REST', 'SQL']);
  });

  test('get interview INT-002 (completed)', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-002`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.interview.score, 82);
    assert.equal(body.interview.recommendation, 'HIRE');
    assert.equal(body.interview.candidate.firstName, 'Petr');
  });
});

// ---------------------------------------------------------------------------
// REST: Full lifecycle (create → status → evaluate)
// ---------------------------------------------------------------------------

describe('REST: interview lifecycle', () => {
  let interviewId;

  test('create interview', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({
        candidateId: 'CAND-001',
        position: 'QA Automation Engineer',
        scheduledAt: '2026-05-21T10:00:00.000Z'
      })
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.match(body.interview.id, /^INT-\d{3}$/);
    assert.equal(body.interview.status, 'SCHEDULED');
    assert.equal(body.interview.candidateId, 'CAND-001');
    assert.equal(body.interview.candidate.firstName, 'Anna');
    assert.equal(body.interview.score, null);
    assert.equal(body.interview.recommendation, null);
    interviewId = body.interview.id;
  });

  test('update status to IN_PROGRESS', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/${interviewId}/status`, {
      method: 'PATCH',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' })
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.interview.status, 'IN_PROGRESS');
  });

  test('evaluate with score 68 → REVIEW', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/${interviewId}/evaluate`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ score: 68 })
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.interview.status, 'COMPLETED');
    assert.equal(body.interview.score, 68);
    assert.equal(body.interview.recommendation, 'REVIEW');
  });
});

describe('REST: recommendation thresholds', () => {
  async function createAndEvaluate(score) {
    const create = await fetch(`${baseUrl}/rest/interviews`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ candidateId: 'CAND-001' })
    });
    const { interview } = await create.json();
    const evaluate = await fetch(`${baseUrl}/rest/interviews/${interview.id}/evaluate`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ score })
    });
    return evaluate.json();
  }

  test('score 91 → HIRE', async () => {
    const body = await createAndEvaluate(91);
    assert.equal(body.interview.recommendation, 'HIRE');
  });

  test('score 75 → HIRE (boundary)', async () => {
    const body = await createAndEvaluate(75);
    assert.equal(body.interview.recommendation, 'HIRE');
  });

  test('score 74 → REVIEW (boundary)', async () => {
    const body = await createAndEvaluate(74);
    assert.equal(body.interview.recommendation, 'REVIEW');
  });

  test('score 55 → REVIEW (boundary)', async () => {
    const body = await createAndEvaluate(55);
    assert.equal(body.interview.recommendation, 'REVIEW');
  });

  test('score 54 → NO_HIRE (boundary)', async () => {
    const body = await createAndEvaluate(54);
    assert.equal(body.interview.recommendation, 'NO_HIRE');
  });

  test('score 0 → NO_HIRE', async () => {
    const body = await createAndEvaluate(0);
    assert.equal(body.interview.recommendation, 'NO_HIRE');
  });

  test('score 100 → HIRE', async () => {
    const body = await createAndEvaluate(100);
    assert.equal(body.interview.recommendation, 'HIRE');
  });
});

// ---------------------------------------------------------------------------
// REST: Candidate search
// ---------------------------------------------------------------------------

describe('REST: candidate endpoints', () => {
  test('get candidate by ID', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates/CAND-001`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.candidate.firstName, 'Anna');
    assert.equal(body.candidate.email, 'anna.novak@example.test');
  });

  test('search by email — exact match', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates?email=petr.svoboda@example.test`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.candidates.length, 1);
    assert.equal(body.candidates[0].id, 'CAND-002');
  });

  test('search by email — no match', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates?email=nobody@example.test`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.candidates.length, 0);
  });

  test('search by skill — SQL', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates?skill=SQL`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.candidates.length, 1);
    assert.equal(body.candidates[0].id, 'CAND-001');
  });

  test('search by skill — case insensitive', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates?skill=soap`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.candidates.length, 1);
    assert.equal(body.candidates[0].id, 'CAND-002');
  });

  test('search by skill — no match', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates?skill=Rust`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.candidates.length, 0);
  });

  test('list all candidates (no filter)', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.candidates.length, 2);
  });
});

// ---------------------------------------------------------------------------
// REST: Parameter chaining (simulates interview task C)
// ---------------------------------------------------------------------------

describe('REST: parameter chaining flow', () => {
  let candidateId;
  let interviewId;

  test('step 1: find candidate by email → extract ID', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates?email=petr.svoboda@example.test`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.candidates.length, 1);
    candidateId = body.candidates[0].id;
    assert.equal(candidateId, 'CAND-002');
  });

  test('step 2: create interview using extracted candidateId', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({
        candidateId,
        position: 'Senior Integration Tester',
        scheduledAt: '2026-07-01T09:00:00.000Z'
      })
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.interview.candidateId, candidateId);
    assert.equal(body.interview.position, 'Senior Integration Tester');
    interviewId = body.interview.id;
  });

  test('step 3: verify interview detail has correct candidate', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/${interviewId}`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.interview.candidate.firstName, 'Petr');
    assert.equal(body.interview.candidate.lastName, 'Svoboda');
    assert.equal(body.interview.position, 'Senior Integration Tester');
  });

  test('step 4: full lifecycle — IN_PROGRESS → evaluate 91 → HIRE', async () => {
    const statusRes = await fetch(`${baseUrl}/rest/interviews/${interviewId}/status`, {
      method: 'PATCH',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' })
    });
    assert.equal(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.equal(statusBody.interview.status, 'IN_PROGRESS');

    const evalRes = await fetch(`${baseUrl}/rest/interviews/${interviewId}/evaluate`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ score: 91 })
    });
    const evalBody = await evalRes.json();
    assert.equal(evalRes.status, 200);
    assert.equal(evalBody.interview.status, 'COMPLETED');
    assert.equal(evalBody.interview.recommendation, 'HIRE');
  });

  test('step 5: filter by candidateId + status confirms completed interview', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews?candidateId=${candidateId}&status=COMPLETED`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 200);
    const found = body.interviews.find((i) => i.id === interviewId);
    assert.ok(found, `Interview ${interviewId} should appear in filtered results`);
    assert.equal(found.status, 'COMPLETED');
  });
});

// ---------------------------------------------------------------------------
// REST: Negative testing / error handling
// ---------------------------------------------------------------------------

describe('REST: error handling', () => {
  test('GET nonexistent interview → 404', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-999`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 404);
    assert.equal(body.error, 'INTERVIEW_NOT_FOUND');
  });

  test('POST interview with unknown candidate → 400', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ candidateId: 'CAND-999' })
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.error, 'UNKNOWN_CANDIDATE');
  });

  test('evaluate with score > 100 → 400', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-001/evaluate`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ score: 150 })
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.error, 'INVALID_SCORE');
  });

  test('evaluate with negative score → 400', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-001/evaluate`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ score: -1 })
    });
    assert.equal(res.status, 400);
  });

  test('evaluate with non-numeric score → 400', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-001/evaluate`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ score: 'abc' })
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.error, 'INVALID_SCORE');
  });

  test('evaluate nonexistent interview → 404', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-999/evaluate`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ score: 50 })
    });
    assert.equal(res.status, 404);
  });

  test('update status with invalid value → 400', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-001/status`, {
      method: 'PATCH',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'INVALID' })
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.error, 'INVALID_STATUS');
  });

  test('update status of nonexistent interview → 404', async () => {
    const res = await fetch(`${baseUrl}/rest/interviews/INT-999/status`, {
      method: 'PATCH',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' })
    });
    assert.equal(res.status, 404);
  });

  test('GET nonexistent candidate → 404', async () => {
    const res = await fetch(`${baseUrl}/rest/candidates/CAND-999`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 404);
    assert.equal(body.error, 'CANDIDATE_NOT_FOUND');
  });

  test('nonexistent route → 404', async () => {
    const res = await fetch(`${baseUrl}/rest/nonexistent`, { headers: ADMIN_HEADERS });
    const body = await res.json();
    assert.equal(res.status, 404);
    assert.equal(body.error, 'ROUTE_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// SOAP: Operations
// ---------------------------------------------------------------------------

describe('SOAP: ListInterviews', () => {
  test('returns list of interviews', async () => {
    const res = await soapPost(`${baseUrl}/soap`, '<tns:ListInterviewsRequest/>');
    const text = await res.text();
    assert.equal(res.status, 200);
    assert.match(text, /ListInterviewsResponse/);
    assert.match(text, /INT-001/);
    assert.match(text, /INT-002/);
  });
});

describe('SOAP: GetInterview', () => {
  test('returns interview detail with candidate', async () => {
    const res = await soapPost(`${baseUrl}/soap`, '<tns:GetInterviewRequest><tns:id>INT-002</tns:id></tns:GetInterviewRequest>');
    const text = await res.text();
    assert.equal(res.status, 200);
    assert.match(text, /GetInterviewResponse/);
    assert.match(text, /82/);
    assert.match(text, /HIRE/);
    assert.match(text, /Petr/);
  });

  test('nonexistent interview → 404 SOAP Fault', async () => {
    const res = await soapPost(`${baseUrl}/soap`, '<tns:GetInterviewRequest><tns:id>INT-999</tns:id></tns:GetInterviewRequest>');
    const text = await res.text();
    assert.equal(res.status, 404);
    assert.match(text, /Fault/);
    assert.match(text, /INTERVIEW_NOT_FOUND/);
  });
});

describe('SOAP: CreateInterview', () => {
  test('creates interview and returns it', async () => {
    const res = await soapPost(`${baseUrl}/soap`, `
      <tns:CreateInterviewRequest>
        <tns:candidateId>CAND-001</tns:candidateId>
        <tns:position>SOAP Tester</tns:position>
        <tns:scheduledAt>2026-06-15T14:00:00.000Z</tns:scheduledAt>
      </tns:CreateInterviewRequest>`);
    const text = await res.text();
    assert.equal(res.status, 200);
    assert.match(text, /CreateInterviewResponse/);
    assert.match(text, /SOAP Tester/);
    assert.match(text, /SCHEDULED/);
  });

  test('unknown candidate → SOAP Fault', async () => {
    const res = await soapPost(`${baseUrl}/soap`, `
      <tns:CreateInterviewRequest>
        <tns:candidateId>CAND-999</tns:candidateId>
      </tns:CreateInterviewRequest>`);
    const text = await res.text();
    assert.equal(res.status, 400);
    assert.match(text, /Fault/);
    assert.match(text, /UNKNOWN_CANDIDATE/);
  });
});

describe('SOAP: UpdateInterviewStatus', () => {
  test('updates status successfully', async () => {
    const res = await soapPost(`${baseUrl}/soap`, `
      <tns:UpdateInterviewStatusRequest>
        <tns:id>INT-001</tns:id>
        <tns:status>IN_PROGRESS</tns:status>
      </tns:UpdateInterviewStatusRequest>`);
    const text = await res.text();
    assert.equal(res.status, 200);
    assert.match(text, /UpdateInterviewStatusResponse/);
    assert.match(text, /IN_PROGRESS/);
  });

  test('nonexistent interview → SOAP Fault', async () => {
    const res = await soapPost(`${baseUrl}/soap`, `
      <tns:UpdateInterviewStatusRequest>
        <tns:id>INT-999</tns:id>
        <tns:status>IN_PROGRESS</tns:status>
      </tns:UpdateInterviewStatusRequest>`);
    assert.equal(res.status, 404);
  });

  test('invalid status → SOAP Fault', async () => {
    const res = await soapPost(`${baseUrl}/soap`, `
      <tns:UpdateInterviewStatusRequest>
        <tns:id>INT-001</tns:id>
        <tns:status>INVALID</tns:status>
      </tns:UpdateInterviewStatusRequest>`);
    assert.equal(res.status, 400);
  });
});

describe('SOAP: error handling', () => {
  test('malformed XML → 400', async () => {
    const res = await fetch(`${baseUrl}/soap`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'text/xml; charset=utf-8' },
      body: 'this is not xml'
    });
    assert.equal(res.status, 400);
  });

  test('DTD declaration → 400 (security)', async () => {
    const res = await fetch(`${baseUrl}/soap`, {
      method: 'POST',
      headers: { ...ADMIN_HEADERS, 'content-type': 'text/xml; charset=utf-8' },
      body: '<!DOCTYPE foo><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body/></soap:Envelope>'
    });
    const text = await res.text();
    assert.equal(res.status, 400);
    assert.match(text, /DTD/i);
  });

  test('unknown SOAP operation → 400', async () => {
    const res = await soapPost(`${baseUrl}/soap`, '<tns:UnknownOperation/>');
    assert.equal(res.status, 400);
  });
});

// ---------------------------------------------------------------------------
// Cross-protocol: REST ↔ SOAP share state
// ---------------------------------------------------------------------------

describe('Cross-protocol: shared state', () => {
  let soapInterviewId;

  test('interview created via SOAP is visible via REST', async () => {
    // Create via SOAP
    const soapRes = await soapPost(`${baseUrl}/soap`, `
      <tns:CreateInterviewRequest>
        <tns:candidateId>CAND-002</tns:candidateId>
        <tns:position>Cross-Protocol Test</tns:position>
        <tns:scheduledAt>2026-08-01T10:00:00.000Z</tns:scheduledAt>
      </tns:CreateInterviewRequest>`);
    const soapText = await soapRes.text();
    assert.equal(soapRes.status, 200);

    // Extract ID from SOAP response
    const idMatch = soapText.match(/<id>(INT-\d{3})<\/id>/);
    assert.ok(idMatch, 'Should find interview ID in SOAP response');
    soapInterviewId = idMatch[1];

    // Verify via REST
    const restRes = await fetch(`${baseUrl}/rest/interviews/${soapInterviewId}`, { headers: ADMIN_HEADERS });
    const restBody = await restRes.json();
    assert.equal(restRes.status, 200);
    assert.equal(restBody.interview.position, 'Cross-Protocol Test');
    assert.equal(restBody.interview.candidate.firstName, 'Petr');
  });

  test('interview status updated via REST is reflected in SOAP', async () => {
    // Update via REST
    await fetch(`${baseUrl}/rest/interviews/${soapInterviewId}/status`, {
      method: 'PATCH',
      headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' })
    });

    // Verify via SOAP
    const soapRes = await soapPost(`${baseUrl}/soap`,
      `<tns:GetInterviewRequest><tns:id>${soapInterviewId}</tns:id></tns:GetInterviewRequest>`);
    const text = await soapRes.text();
    assert.match(text, /CANCELLED/);
  });
});
