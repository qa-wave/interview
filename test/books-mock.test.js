const assert = require('node:assert/strict');
const { test, describe, before, after } = require('node:test');
const {
  createApp,
  DEFAULT_BEARER_TOKEN,
  DEFAULT_WS_SECURITY_USER,
  DEFAULT_WS_SECURITY_PASS
} = require('../server/server');

let server;
let baseUrl;

const bearerHeaders = { authorization: `Bearer ${DEFAULT_BEARER_TOKEN}` };

function soapEnvelope(body, username = DEFAULT_WS_SECURITY_USER, password = DEFAULT_WS_SECURITY_PASS) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="urn:books-mock"
               xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soap:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${username}</wsse:Username>
        <wsse:Password Type="PasswordText">${password}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;
}

function soapPost(body) {
  return fetch(`${baseUrl}/soap`, {
    method: 'POST',
    headers: { 'content-type': 'text/xml; charset=utf-8' },
    body: soapEnvelope(body)
  });
}

before(async () => {
  const app = createApp();
  await new Promise((resolve, reject) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Test server did not bind to a TCP port.'));
        return;
      }
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
    server.once('error', reject);
  });
});

after(async () => {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe('public endpoints', () => {
  test('healthcheck', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'books-mock');
  });

  test('wsdl', async () => {
    const res = await fetch(`${baseUrl}/soap?wsdl`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /BooksMockService/);
  });
});

describe('REST auth and flow', () => {
  test('rejects REST without token', async () => {
    const res = await fetch(`${baseUrl}/rest/books`);
    assert.equal(res.status, 401);
  });

  test('finds book and creates loan', async () => {
    const bookRes = await fetch(`${baseUrl}/rest/books?isbn=978-80-000-0002-8`, { headers: bearerHeaders });
    const bookBody = await bookRes.json();
    assert.equal(bookRes.status, 200);
    assert.equal(bookBody.books[0].id, 'BOOK-002');

    const loanRes = await fetch(`${baseUrl}/rest/loans`, {
      method: 'POST',
      headers: { ...bearerHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ bookId: 'BOOK-002', borrowerName: 'QA Candidate', dueDate: '2026-06-01' })
    });
    const loanBody = await loanRes.json();
    assert.equal(loanRes.status, 201);
    assert.equal(loanBody.loan.status, 'REQUESTED');

    const statusRes = await fetch(`${baseUrl}/rest/loans/${loanBody.loan.id}/status`, {
      method: 'PATCH',
      headers: { ...bearerHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'BORROWED' })
    });
    const statusBody = await statusRes.json();
    assert.equal(statusRes.status, 200);
    assert.equal(statusBody.loan.status, 'BORROWED');
  });
});

describe('SOAP auth and shared state', () => {
  test('rejects SOAP without security header', async () => {
    const res = await fetch(`${baseUrl}/soap`, {
      method: 'POST',
      headers: { 'content-type': 'text/xml; charset=utf-8' },
      body: '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><ListLoansRequest/></soap:Body></soap:Envelope>'
    });
    assert.equal(res.status, 401);
  });

  test('lists loans with valid WS-Security', async () => {
    const res = await soapPost('<tns:ListLoansRequest/>');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /ListLoansResponse/);
  });
});
