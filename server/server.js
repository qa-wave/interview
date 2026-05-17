#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { XMLParser } = require('fast-xml-parser');

const DEFAULT_PORT = 4010;
const SERVICE_NAME = 'books-mock';
const DEFAULT_BEARER_TOKEN = 'BOOKS-REST-TOKEN-2026';
const DEFAULT_WS_SECURITY_USER = 'books-user';
const DEFAULT_WS_SECURITY_PASS = 'Books!2026';
const LOAN_STATUSES = new Set(['REQUESTED', 'BORROWED', 'RETURNED', 'OVERDUE', 'CANCELLED', 'LOST']);
const PUBLIC_PATHS = new Set([
  '/',
  '/health',
  '/services',
  '/swagger',
  '/openapi.yaml',
  '/openapi-books.yaml',
  '/openapi-loans.yaml',
  '/rest'
]);

function readConfig(options = {}) {
  const bearerToken = options.bearerToken || process.env.REST_BEARER_TOKEN || DEFAULT_BEARER_TOKEN;
  const soapUser = options.soapUser || process.env.SOAP_USER || DEFAULT_WS_SECURITY_USER;
  const soapPass = options.soapPass || process.env.SOAP_PASS || DEFAULT_WS_SECURITY_PASS;

  return { bearerToken, soapUser, soapPass };
}

function defaultMockPath() {
  return path.join(__dirname, 'mocks', 'books.mock.json');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadMockData(configuredPath = process.env.MOCK_DATA_PATH) {
  const sourcePath = configuredPath ? path.resolve(configuredPath) : defaultMockPath();
  const data = readJson(sourcePath);

  return {
    sourcePath,
    books: Array.isArray(data.books) ? structuredClone(data.books) : [],
    loans: Array.isArray(data.loans) ? structuredClone(data.loans) : []
  };
}

function requireBearerAuth(config) {
  return (req, res, next) => {
    if (PUBLIC_PATHS.has(req.path)) return next();
    if (req.path === '/soap') return next();

    const authHeader = req.get('authorization');
    if (!authHeader) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing Authorization header. Use: Bearer <token>' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authorization header must use Bearer scheme.' });
    }

    if (authHeader.substring(7).trim() !== config.bearerToken) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid Bearer token.' });
    }

    return next();
  };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function validationError(res, message, details = []) {
  return res.status(400).json({ error: 'INVALID_REQUEST', message, details });
}

function normalizeCreateLoanInput(input = {}) {
  const bookId = input.bookId;
  const borrowerName = input.borrowerName;
  const dueDate = input.dueDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const errors = [];

  if (!isNonEmptyString(bookId)) errors.push({ field: 'bookId', message: 'bookId is required.' });
  if (!isNonEmptyString(borrowerName)) errors.push({ field: 'borrowerName', message: 'borrowerName is required.' });
  if (!isValidDate(dueDate)) errors.push({ field: 'dueDate', message: 'dueDate must be a valid date.' });

  return {
    value: {
      bookId: typeof bookId === 'string' ? bookId.trim() : bookId,
      borrowerName: typeof borrowerName === 'string' ? borrowerName.trim() : borrowerName,
      dueDate
    },
    errors
  };
}

function normalizeRating(value) {
  if (value === null || value === undefined || value === '') return Number.NaN;
  return Number(value);
}

function recommendationForRating(rating) {
  return rating >= 4 ? 'RECOMMENDED' : rating >= 3 ? 'NEUTRAL' : 'NOT_RECOMMENDED';
}

const ALLOWED_TRANSITIONS = {
  REQUESTED: new Set(['REQUESTED', 'BORROWED', 'CANCELLED']),
  BORROWED: new Set(['BORROWED', 'RETURNED', 'OVERDUE', 'LOST']),
  OVERDUE: new Set(['OVERDUE', 'RETURNED', 'LOST']),
  RETURNED: new Set(['RETURNED']),
  CANCELLED: new Set(['CANCELLED']),
  LOST: new Set(['LOST'])
};

function canTransition(from, to) {
  return ALLOWED_TRANSITIONS[from]?.has(to) || false;
}

function nextLoanId(loans) {
  const highest = loans.reduce((max, loan) => {
    const match = /^LOAN-(\d+)$/.exec(loan.id || '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `LOAN-${String(highest + 1).padStart(3, '0')}`;
}

function withBook(loan, books) {
  if (!loan) return undefined;
  const book = books.find((item) => item.id === loan.bookId);
  return { ...loan, book: book || null };
}

function setBookAvailability(books, bookId, available) {
  const book = books.find((item) => item.id === bookId);
  if (book) book.available = available;
}

function xmlText(value) {
  if (value && typeof value === 'object' && '#text' in value) return value['#text'];
  return value;
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function objectToXml(name, value) {
  if (Array.isArray(value)) return value.map((item) => objectToXml(name, item)).join('');
  if (value === null || value === undefined) return `<${name}/>`;
  if (typeof value !== 'object') return `<${name}>${escapeXml(value)}</${name}>`;

  return `<${name}>${Object.entries(value).map(([key, child]) => objectToXml(key, child)).join('')}</${name}>`;
}

function soapEnvelope(operationName, payload) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:books-mock">',
    '<soap:Body>',
    objectToXml(`tns:${operationName}`, payload),
    '</soap:Body>',
    '</soap:Envelope>'
  ].join('');
}

function soapFault(message, detail = 'Invalid SOAP request') {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    '<soap:Body><soap:Fault>',
    '<faultcode>soap:Client</faultcode>',
    `<faultstring>${escapeXml(message)}</faultstring>`,
    `<detail>${escapeXml(detail)}</detail>`,
    '</soap:Fault></soap:Body></soap:Envelope>'
  ].join('');
}

function publicBaseUrl(req) {
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get('host')}`;
}

function wsdlXml(baseUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:tns="urn:books-mock"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  targetNamespace="urn:books-mock"
  name="BooksMockService">
  <types>
    <xsd:schema targetNamespace="urn:books-mock" elementFormDefault="qualified">
      <xsd:simpleType name="LoanStatus"><xsd:restriction base="xsd:string"><xsd:enumeration value="REQUESTED"/><xsd:enumeration value="BORROWED"/><xsd:enumeration value="RETURNED"/><xsd:enumeration value="OVERDUE"/><xsd:enumeration value="CANCELLED"/><xsd:enumeration value="LOST"/></xsd:restriction></xsd:simpleType>
      <xsd:complexType name="Book"><xsd:sequence><xsd:element name="id" type="xsd:string"/><xsd:element name="isbn" type="xsd:string"/><xsd:element name="title" type="xsd:string"/><xsd:element name="author" type="xsd:string"/><xsd:element name="category" type="xsd:string"/><xsd:element name="available" type="xsd:boolean"/></xsd:sequence></xsd:complexType>
      <xsd:complexType name="Loan"><xsd:sequence><xsd:element name="id" type="xsd:string"/><xsd:element name="bookId" type="xsd:string"/><xsd:element name="borrowerName" type="xsd:string"/><xsd:element name="dueDate" type="xsd:date"/><xsd:element name="status" type="tns:LoanStatus"/><xsd:element name="rating" type="xsd:decimal" minOccurs="0"/><xsd:element name="recommendation" type="xsd:string" minOccurs="0"/><xsd:element name="book" type="tns:Book" minOccurs="0"/></xsd:sequence></xsd:complexType>
      <xsd:element name="ListLoansRequest"><xsd:complexType><xsd:sequence><xsd:element name="status" type="tns:LoanStatus" minOccurs="0"/><xsd:element name="bookId" type="xsd:string" minOccurs="0"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="ListLoansResponse"><xsd:complexType><xsd:sequence><xsd:element name="loans" minOccurs="0"><xsd:complexType><xsd:sequence><xsd:element name="loan" type="tns:Loan" minOccurs="0" maxOccurs="unbounded"/></xsd:sequence></xsd:complexType></xsd:element></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="GetLoanRequest"><xsd:complexType><xsd:sequence><xsd:element name="id" type="xsd:string"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="GetLoanResponse"><xsd:complexType><xsd:sequence><xsd:element name="loan" type="tns:Loan"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="CreateLoanRequest"><xsd:complexType><xsd:sequence><xsd:element name="bookId" type="xsd:string"/><xsd:element name="borrowerName" type="xsd:string"/><xsd:element name="dueDate" type="xsd:date" minOccurs="0"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="CreateLoanResponse"><xsd:complexType><xsd:sequence><xsd:element name="loan" type="tns:Loan"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="UpdateLoanStatusRequest"><xsd:complexType><xsd:sequence><xsd:element name="id" type="xsd:string"/><xsd:element name="status" type="tns:LoanStatus"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="UpdateLoanStatusResponse"><xsd:complexType><xsd:sequence><xsd:element name="loan" type="tns:Loan"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="ReviewLoanRequest"><xsd:complexType><xsd:sequence><xsd:element name="id" type="xsd:string"/><xsd:element name="rating" type="xsd:decimal"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="ReviewLoanResponse"><xsd:complexType><xsd:sequence><xsd:element name="loan" type="tns:Loan"/></xsd:sequence></xsd:complexType></xsd:element>
    </xsd:schema>
  </types>
  <message name="ListLoansInput"><part name="parameters" element="tns:ListLoansRequest"/></message>
  <message name="ListLoansOutput"><part name="parameters" element="tns:ListLoansResponse"/></message>
  <message name="GetLoanInput"><part name="parameters" element="tns:GetLoanRequest"/></message>
  <message name="GetLoanOutput"><part name="parameters" element="tns:GetLoanResponse"/></message>
  <message name="CreateLoanInput"><part name="parameters" element="tns:CreateLoanRequest"/></message>
  <message name="CreateLoanOutput"><part name="parameters" element="tns:CreateLoanResponse"/></message>
  <message name="UpdateLoanStatusInput"><part name="parameters" element="tns:UpdateLoanStatusRequest"/></message>
  <message name="UpdateLoanStatusOutput"><part name="parameters" element="tns:UpdateLoanStatusResponse"/></message>
  <message name="ReviewLoanInput"><part name="parameters" element="tns:ReviewLoanRequest"/></message>
  <message name="ReviewLoanOutput"><part name="parameters" element="tns:ReviewLoanResponse"/></message>
  <portType name="BooksMockPortType">
    <operation name="ListLoans"><input message="tns:ListLoansInput"/><output message="tns:ListLoansOutput"/></operation>
    <operation name="GetLoan"><input message="tns:GetLoanInput"/><output message="tns:GetLoanOutput"/></operation>
    <operation name="CreateLoan"><input message="tns:CreateLoanInput"/><output message="tns:CreateLoanOutput"/></operation>
    <operation name="UpdateLoanStatus"><input message="tns:UpdateLoanStatusInput"/><output message="tns:UpdateLoanStatusOutput"/></operation>
    <operation name="ReviewLoan"><input message="tns:ReviewLoanInput"/><output message="tns:ReviewLoanOutput"/></operation>
  </portType>
  <binding name="BooksMockSoapBinding" type="tns:BooksMockPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="ListLoans"><soap:operation soapAction="urn:books-mock#ListLoans"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
    <operation name="GetLoan"><soap:operation soapAction="urn:books-mock#GetLoan"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
    <operation name="CreateLoan"><soap:operation soapAction="urn:books-mock#CreateLoan"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
    <operation name="UpdateLoanStatus"><soap:operation soapAction="urn:books-mock#UpdateLoanStatus"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
    <operation name="ReviewLoan"><soap:operation soapAction="urn:books-mock#ReviewLoan"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
  </binding>
  <service name="BooksMockService">
    <port name="BooksMockSoapPort" binding="tns:BooksMockSoapBinding">
      <soap:address location="${baseUrl}/soap"/>
    </port>
  </service>
</definitions>`;
}

function swaggerHtml(baseUrl) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Books Mock Swagger</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({dom_id:'#swagger-ui',urls:[{url:'${baseUrl}/openapi-books.yaml',name:'Books REST API'},{url:'${baseUrl}/openapi-loans.yaml',name:'Loans REST API'}]});</script></body></html>`;
}

function servicesHtml(config) {
  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Books Mock - sluzby</title><style>body{font-family:Arial,sans-serif;margin:32px;background:#f6f7f9;color:#17202a}main{max-width:900px;margin:auto}.box{background:#fff;border:1px solid #d9dee7;border-radius:8px;padding:20px;margin:16px 0}a{color:#1266f1}code{font-family:Consolas,monospace}</style></head>
<body><main><h1>Books Mock - sluzby</h1><p>REST i SOAP bezi na stejnem serveru.</p>
<div class="box"><h2>REST</h2><p><a href="/swagger">Swagger UI</a></p><p><a href="/openapi-books.yaml">Books OpenAPI</a></p><p><a href="/openapi-loans.yaml">Loans OpenAPI</a></p><p>Authorization: <code>Bearer ${config.bearerToken}</code></p></div>
<div class="box"><h2>SOAP</h2><p><a href="/soap?wsdl">WSDL</a></p><p>Username: <code>${config.soapUser}</code><br>Password: <code>${config.soapPass}</code></p></div>
<div class="box"><h2>Health</h2><p><a href="/health">/health</a></p></div></main></body></html>`;
}

function createApp(options = {}) {
  const config = readConfig(options);
  const state = loadMockData(options.mockDataPath);
  const app = express();
  const xmlParser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, trimValues: true });

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.text({ type: ['application/xml', 'text/xml', '*/xml'], limit: '1mb' }));
  app.use(requireBearerAuth(config));

  app.get('/', (_req, res) => res.redirect('/services'));
  app.get('/services', (_req, res) => res.type('html').send(servicesHtml(config)));
  app.get('/swagger', (req, res) => res.type('html').send(swaggerHtml(publicBaseUrl(req))));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: SERVICE_NAME, data: { books: state.books.length, loans: state.loans.length } }));
  app.get('/openapi.yaml', (_req, res) => res.type('text/yaml').send(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8')));
  app.get('/openapi-books.yaml', (_req, res) => res.type('text/yaml').send(fs.readFileSync(path.join(__dirname, 'docs', 'openapi-books.yaml'), 'utf8')));
  app.get('/openapi-loans.yaml', (_req, res) => res.type('text/yaml').send(fs.readFileSync(path.join(__dirname, 'docs', 'openapi-loans.yaml'), 'utf8')));

  app.get('/rest', (req, res) => {
    const baseUrl = publicBaseUrl(req);
    res.json({
      service: 'Books REST Mock',
      endpoints: [
        `GET ${baseUrl}/rest/books`,
        `GET ${baseUrl}/rest/books/{id}`,
        `GET ${baseUrl}/rest/loans`,
        `POST ${baseUrl}/rest/loans`,
        `PATCH ${baseUrl}/rest/loans/{id}/status`,
        `POST ${baseUrl}/rest/loans/{id}/review`
      ]
    });
  });

  app.get('/rest/books', (req, res) => {
    const { isbn, author, available } = req.query;
    let books = state.books;
    if (isbn) books = books.filter((book) => book.isbn === isbn);
    if (author) books = books.filter((book) => book.author.toLowerCase().includes(String(author).toLowerCase()));
    if (available !== undefined) books = books.filter((book) => String(book.available) === String(available));
    res.json({ books });
  });

  app.get('/rest/books/:id', (req, res) => {
    const book = state.books.find((item) => item.id === req.params.id);
    if (!book) return res.status(404).json({ error: 'BOOK_NOT_FOUND', message: 'Book was not found.' });
    return res.json({ book });
  });

  app.get('/rest/loans', (req, res) => {
    const { status, bookId } = req.query;
    const loans = state.loans
      .filter((loan) => !status || loan.status === status)
      .filter((loan) => !bookId || loan.bookId === bookId)
      .map((loan) => withBook(loan, state.books));
    res.json({ loans });
  });

  app.post('/rest/loans', (req, res) => {
    const { value, errors } = normalizeCreateLoanInput(req.body || {});
    if (errors.length > 0) return validationError(res, 'Loan payload is invalid.', errors);

    const book = state.books.find((item) => item.id === value.bookId);
    if (!book) return validationError(res, 'Loan payload is invalid.', [{ field: 'bookId', message: 'bookId must match an existing book.' }]);
    if (!book.available) return res.status(409).json({ error: 'BOOK_NOT_AVAILABLE', message: 'Book is not available.' });

    const loan = { id: nextLoanId(state.loans), ...value, status: 'REQUESTED', rating: null, recommendation: null };
    state.loans.push(loan);
    setBookAvailability(state.books, value.bookId, false);
    return res.status(201).json({ loan: withBook(loan, state.books) });
  });

  app.get('/rest/loans/:id', (req, res) => {
    const loan = state.loans.find((item) => item.id === req.params.id);
    if (!loan) return res.status(404).json({ error: 'LOAN_NOT_FOUND', message: 'Loan was not found.' });
    return res.json({ loan: withBook(loan, state.books) });
  });

  app.patch('/rest/loans/:id/status', (req, res) => {
    const loan = state.loans.find((item) => item.id === req.params.id);
    if (!loan) return res.status(404).json({ error: 'LOAN_NOT_FOUND', message: 'Loan was not found.' });

    const status = req.body?.status;
    if (!LOAN_STATUSES.has(status)) {
      return validationError(res, 'Status payload is invalid.', [{ field: 'status', message: `status must be one of: ${Array.from(LOAN_STATUSES).join(', ')}.` }]);
    }
    if (!canTransition(loan.status, status)) {
      return res.status(409).json({ error: 'INVALID_STATUS_TRANSITION', message: `Cannot change status from ${loan.status} to ${status}.` });
    }

    loan.status = status;
    if (status === 'RETURNED' || status === 'CANCELLED') setBookAvailability(state.books, loan.bookId, true);
    return res.json({ loan: withBook(loan, state.books) });
  });

  app.post('/rest/loans/:id/review', (req, res) => {
    const loan = state.loans.find((item) => item.id === req.params.id);
    if (!loan) return res.status(404).json({ error: 'LOAN_NOT_FOUND', message: 'Loan was not found.' });

    const rating = normalizeRating(req.body?.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return validationError(res, 'Review payload is invalid.', [{ field: 'rating', message: 'rating must be a number from 1 to 5.' }]);
    }

    loan.rating = rating;
    loan.recommendation = recommendationForRating(rating);
    loan.status = 'RETURNED';
    setBookAvailability(state.books, loan.bookId, true);
    return res.json({ loan: withBook(loan, state.books) });
  });

  app.get('/soap', (req, res) => {
    if ('wsdl' in req.query) return res.type('application/xml').send(wsdlXml(publicBaseUrl(req)));
    return res.type('text/plain').send('SOAP endpoint is available. Use /soap?wsdl for WSDL.');
  });

  app.post('/soap', (req, res) => {
    try {
      const parsed = xmlParser.parse(req.body);
      const envelope = parsed.Envelope;
      const security = envelope?.Header?.Security;
      const usernameToken = security?.UsernameToken;
      if (!usernameToken) {
        return res.status(401).type('application/xml').send(soapFault('WS-Security UsernameToken is required in SOAP Header.', 'AUTHENTICATION_REQUIRED'));
      }

      if (xmlText(usernameToken.Username) !== config.soapUser || xmlText(usernameToken.Password) !== config.soapPass) {
        return res.status(401).type('application/xml').send(soapFault('Invalid WS-Security credentials.', 'AUTHENTICATION_FAILED'));
      }

      const body = envelope?.Body;
      const [operationName, rawPayload] = Object.entries(body || {})[0] || [];
      const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
      if (!operationName) throw new Error('SOAP Body is missing.');

      if (operationName === 'ListLoansRequest' || operationName === 'ListLoans') {
        const loans = state.loans
          .filter((loan) => !payload.status || loan.status === payload.status)
          .filter((loan) => !payload.bookId || loan.bookId === payload.bookId)
          .map((loan) => withBook(loan, state.books));
        return res.type('application/xml').send(soapEnvelope('ListLoansResponse', { loans: { loan: loans } }));
      }

      if (operationName === 'GetLoanRequest' || operationName === 'GetLoan') {
        const loan = state.loans.find((item) => item.id === payload.id);
        if (!loan) return res.status(404).type('application/xml').send(soapFault('Loan was not found.', 'LOAN_NOT_FOUND'));
        return res.type('application/xml').send(soapEnvelope('GetLoanResponse', { loan: withBook(loan, state.books) }));
      }

      if (operationName === 'CreateLoanRequest' || operationName === 'CreateLoan') {
        const { value, errors } = normalizeCreateLoanInput(payload);
        if (errors.length > 0) return res.status(400).type('application/xml').send(soapFault('Loan payload is invalid.', 'INVALID_REQUEST'));
        const book = state.books.find((item) => item.id === value.bookId);
        if (!book) return res.status(400).type('application/xml').send(soapFault('bookId must match an existing book.', 'UNKNOWN_BOOK'));
        if (!book.available) return res.status(409).type('application/xml').send(soapFault('Book is not available.', 'BOOK_NOT_AVAILABLE'));
        const loan = { id: nextLoanId(state.loans), ...value, status: 'REQUESTED', rating: null, recommendation: null };
        state.loans.push(loan);
        setBookAvailability(state.books, value.bookId, false);
        return res.type('application/xml').send(soapEnvelope('CreateLoanResponse', { loan: withBook(loan, state.books) }));
      }

      if (operationName === 'UpdateLoanStatusRequest' || operationName === 'UpdateLoanStatus') {
        const loan = state.loans.find((item) => item.id === payload.id);
        if (!loan) return res.status(404).type('application/xml').send(soapFault('Loan was not found.', 'LOAN_NOT_FOUND'));
        if (!LOAN_STATUSES.has(payload.status)) return res.status(400).type('application/xml').send(soapFault('Invalid loan status.', 'INVALID_STATUS'));
        if (!canTransition(loan.status, payload.status)) return res.status(409).type('application/xml').send(soapFault(`Cannot change status from ${loan.status} to ${payload.status}.`, 'INVALID_STATUS_TRANSITION'));
        loan.status = payload.status;
        if (payload.status === 'RETURNED' || payload.status === 'CANCELLED') setBookAvailability(state.books, loan.bookId, true);
        return res.type('application/xml').send(soapEnvelope('UpdateLoanStatusResponse', { loan: withBook(loan, state.books) }));
      }

      if (operationName === 'ReviewLoanRequest' || operationName === 'ReviewLoan') {
        const loan = state.loans.find((item) => item.id === payload.id);
        if (!loan) return res.status(404).type('application/xml').send(soapFault('Loan was not found.', 'LOAN_NOT_FOUND'));
        const rating = normalizeRating(payload.rating);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).type('application/xml').send(soapFault('rating must be a number from 1 to 5.', 'INVALID_RATING'));
        loan.rating = rating;
        loan.recommendation = recommendationForRating(rating);
        loan.status = 'RETURNED';
        setBookAvailability(state.books, loan.bookId, true);
        return res.type('application/xml').send(soapEnvelope('ReviewLoanResponse', { loan: withBook(loan, state.books) }));
      }

      return res.status(400).type('application/xml').send(soapFault(`Unsupported SOAP operation: ${operationName}`, 'UNSUPPORTED_OPERATION'));
    } catch (error) {
      return res.status(400).type('application/xml').send(soapFault('Malformed SOAP envelope.', error.message));
    }
  });

  app.post('/admin/reset', (req, res) => {
    const fresh = loadMockData(options.mockDataPath);
    state.books = fresh.books;
    state.loans = fresh.loans;
    res.json({ status: 'reset', data: { books: state.books.length, loans: state.loans.length } });
  });

  app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} was not found.` }));

  return app;
}

function start() {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const app = createApp();
  app.listen(port, () => {
    console.log(`${SERVICE_NAME} listening on http://localhost:${port}`);
    console.log(`Services: http://localhost:${port}/services`);
    console.log(`Swagger: http://localhost:${port}/swagger`);
    console.log(`SOAP WSDL: http://localhost:${port}/soap?wsdl`);
  });
}

if (require.main === module) start();

module.exports = {
  createApp,
  DEFAULT_BEARER_TOKEN,
  DEFAULT_WS_SECURITY_USER,
  DEFAULT_WS_SECURITY_PASS
};
