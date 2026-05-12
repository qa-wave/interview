const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const app = require('../server');

let server;
let baseUrl;

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

test('healthcheck returns service status', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.deepEqual(body.protocols, ['REST', 'SOAP']);
});

test('REST returns interview detail with candidate', async () => {
  const response = await fetch(`${baseUrl}/rest/interviews/INT-001`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.interview.id, 'INT-001');
  assert.equal(body.interview.candidate.id, 'CAND-001');
});

test('REST can create and evaluate an interview', async () => {
  const createResponse = await fetch(`${baseUrl}/rest/interviews`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      candidateId: 'CAND-001',
      position: 'QA Automation Engineer',
      scheduledAt: '2026-05-21T10:00:00.000Z'
    })
  });
  const createBody = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.match(createBody.interview.id, /^INT-\d{3}$/);

  const evaluateResponse = await fetch(`${baseUrl}/rest/interviews/${createBody.interview.id}/evaluate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ score: 88 })
  });
  const evaluateBody = await evaluateResponse.json();

  assert.equal(evaluateResponse.status, 200);
  assert.equal(evaluateBody.interview.status, 'COMPLETED');
  assert.equal(evaluateBody.interview.recommendation, 'HIRE');
});

test('SOAP WSDL is available', async () => {
  const response = await fetch(`${baseUrl}/soap?wsdl`);
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /InterviewMockService/);
  assert.match(text, /soap:address/);
});

test('SOAP can return interview detail', async () => {
  const response = await fetch(`${baseUrl}/soap`, {
    method: 'POST',
    headers: {
      'content-type': 'text/xml; charset=utf-8',
      SOAPAction: 'urn:interview-mock#GetInterview'
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:interview-mock">
  <soap:Body>
    <tns:GetInterviewRequest>
      <tns:id>INT-001</tns:id>
    </tns:GetInterviewRequest>
  </soap:Body>
</soap:Envelope>`
  });
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /GetInterviewResponse/);
  assert.match(text, /INT-001/);
  assert.match(text, /CAND-001/);
});
