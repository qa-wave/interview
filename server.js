#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { XMLParser } = require('fast-xml-parser');

const DEFAULT_PORT = 4010;
const SERVICE_NAME = 'interview-mock';
const ALLOWED_STATUSES = new Set(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function defaultMockPath() {
  return path.join(__dirname, 'mocks', 'interview.mock.json');
}

function loadMockData() {
  const configuredPath = process.env.MOCK_DATA_PATH;
  const sourcePath = configuredPath ? path.resolve(configuredPath) : defaultMockPath();
  const data = readJson(sourcePath);

  return {
    sourcePath,
    interviews: Array.isArray(data.interviews) ? structuredClone(data.interviews) : [],
    candidates: Array.isArray(data.candidates) ? structuredClone(data.candidates) : []
  };
}

function nextInterviewId(interviews) {
  const highest = interviews.reduce((max, interview) => {
    const match = /^INT-(\d+)$/.exec(interview.id || '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `INT-${String(highest + 1).padStart(3, '0')}`;
}

function withCandidate(interview, candidates) {
  if (!interview) {
    return undefined;
  }

  const candidate = candidates.find((item) => item.id === interview.candidateId);
  return { ...interview, candidate: candidate || null };
}

function publicBaseUrl(req) {
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get('host')}`;
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
  if (Array.isArray(value)) {
    return value.map((item) => objectToXml(name, item)).join('');
  }

  if (value === null || value === undefined) {
    return `<${name}/>`;
  }

  if (typeof value !== 'object') {
    return `<${name}>${escapeXml(value)}</${name}>`;
  }

  const children = Object.entries(value)
    .map(([key, childValue]) => objectToXml(key, childValue))
    .join('');

  return `<${name}>${children}</${name}>`;
}

function soapEnvelope(operationName, payload) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:interview-mock">',
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
    '<soap:Body>',
    '<soap:Fault>',
    '<faultcode>soap:Client</faultcode>',
    `<faultstring>${escapeXml(message)}</faultstring>`,
    `<detail>${escapeXml(detail)}</detail>`,
    '</soap:Fault>',
    '</soap:Body>',
    '</soap:Envelope>'
  ].join('');
}

function wsdlXml(baseUrl) {
  const endpoint = `${baseUrl}/soap`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:tns="urn:interview-mock"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  targetNamespace="urn:interview-mock"
  name="InterviewMockService">
  <types>
    <xsd:schema targetNamespace="urn:interview-mock" elementFormDefault="qualified">
      <xsd:element name="ListInterviewsRequest" type="xsd:anyType"/>
      <xsd:element name="ListInterviewsResponse" type="xsd:anyType"/>
      <xsd:element name="GetInterviewRequest" type="xsd:anyType"/>
      <xsd:element name="GetInterviewResponse" type="xsd:anyType"/>
      <xsd:element name="CreateInterviewRequest" type="xsd:anyType"/>
      <xsd:element name="CreateInterviewResponse" type="xsd:anyType"/>
      <xsd:element name="UpdateInterviewStatusRequest" type="xsd:anyType"/>
      <xsd:element name="UpdateInterviewStatusResponse" type="xsd:anyType"/>
    </xsd:schema>
  </types>
  <message name="ListInterviewsInput"><part name="parameters" element="tns:ListInterviewsRequest"/></message>
  <message name="ListInterviewsOutput"><part name="parameters" element="tns:ListInterviewsResponse"/></message>
  <message name="GetInterviewInput"><part name="parameters" element="tns:GetInterviewRequest"/></message>
  <message name="GetInterviewOutput"><part name="parameters" element="tns:GetInterviewResponse"/></message>
  <message name="CreateInterviewInput"><part name="parameters" element="tns:CreateInterviewRequest"/></message>
  <message name="CreateInterviewOutput"><part name="parameters" element="tns:CreateInterviewResponse"/></message>
  <message name="UpdateInterviewStatusInput"><part name="parameters" element="tns:UpdateInterviewStatusRequest"/></message>
  <message name="UpdateInterviewStatusOutput"><part name="parameters" element="tns:UpdateInterviewStatusResponse"/></message>
  <portType name="InterviewMockPortType">
    <operation name="ListInterviews"><input message="tns:ListInterviewsInput"/><output message="tns:ListInterviewsOutput"/></operation>
    <operation name="GetInterview"><input message="tns:GetInterviewInput"/><output message="tns:GetInterviewOutput"/></operation>
    <operation name="CreateInterview"><input message="tns:CreateInterviewInput"/><output message="tns:CreateInterviewOutput"/></operation>
    <operation name="UpdateInterviewStatus"><input message="tns:UpdateInterviewStatusInput"/><output message="tns:UpdateInterviewStatusOutput"/></operation>
  </portType>
  <binding name="InterviewMockSoapBinding" type="tns:InterviewMockPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="ListInterviews"><soap:operation soapAction="urn:interview-mock#ListInterviews"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
    <operation name="GetInterview"><soap:operation soapAction="urn:interview-mock#GetInterview"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
    <operation name="CreateInterview"><soap:operation soapAction="urn:interview-mock#CreateInterview"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
    <operation name="UpdateInterviewStatus"><soap:operation soapAction="urn:interview-mock#UpdateInterviewStatus"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
  </binding>
  <service name="InterviewMockService">
    <port name="InterviewMockSoapPort" binding="tns:InterviewMockSoapBinding">
      <soap:address location="${escapeXml(endpoint)}"/>
    </port>
  </service>
</definitions>`;
}

function createApp() {
  const app = express();
  const state = loadMockData();
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true
  });

  app.disable('x-powered-by');
  app.use(cors());
  app.use('/soap', express.text({
    type: ['text/xml', 'application/xml', 'application/soap+xml', '*/xml'],
    limit: '1mb'
  }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (req, res) => {
    const baseUrl = publicBaseUrl(req);
    res.json({
      service: SERVICE_NAME,
      version: require('./package.json').version,
      protocols: ['REST', 'SOAP'],
      mockData: path.basename(state.sourcePath),
      endpoints: {
        health: `${baseUrl}/health`,
        rest: `${baseUrl}/rest`,
        openapi: `${baseUrl}/openapi.yaml`,
        soap: `${baseUrl}/soap`,
        wsdl: `${baseUrl}/soap?wsdl`
      }
    });
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
      protocols: ['REST', 'SOAP'],
      counts: {
        interviews: state.interviews.length,
        candidates: state.candidates.length
      }
    });
  });

  app.get('/openapi.yaml', (_req, res) => {
    res.type('text/yaml').send(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
  });

  app.get('/rest', (req, res) => {
    const baseUrl = publicBaseUrl(req);
    res.json({
      service: 'Interview REST Mock',
      endpoints: [
        `GET ${baseUrl}/rest/interviews`,
        `GET ${baseUrl}/rest/interviews/{id}`,
        `POST ${baseUrl}/rest/interviews`,
        `PATCH ${baseUrl}/rest/interviews/{id}/status`,
        `POST ${baseUrl}/rest/interviews/{id}/evaluate`,
        `GET ${baseUrl}/rest/candidates/{id}`
      ]
    });
  });

  app.get('/rest/interviews', (req, res) => {
    const { status, candidateId } = req.query;
    const interviews = state.interviews
      .filter((interview) => !status || interview.status === status)
      .filter((interview) => !candidateId || interview.candidateId === candidateId)
      .map((interview) => withCandidate(interview, state.candidates));

    res.json({ interviews });
  });

  app.post('/rest/interviews', (req, res) => {
    const { candidateId, position, scheduledAt } = req.body || {};
    const candidate = state.candidates.find((item) => item.id === candidateId);

    if (!candidate) {
      return res.status(400).json({
        error: 'UNKNOWN_CANDIDATE',
        message: 'candidateId must match an existing candidate.'
      });
    }

    const interview = {
      id: nextInterviewId(state.interviews),
      candidateId,
      position: position || 'Software Engineer',
      scheduledAt: scheduledAt || new Date().toISOString(),
      status: 'SCHEDULED',
      score: null,
      recommendation: null
    };

    state.interviews.push(interview);
    return res.status(201).json({ interview: withCandidate(interview, state.candidates) });
  });

  app.get('/rest/interviews/:id', (req, res) => {
    const interview = state.interviews.find((item) => item.id === req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'INTERVIEW_NOT_FOUND', message: 'Interview was not found.' });
    }

    return res.json({ interview: withCandidate(interview, state.candidates) });
  });

  app.patch('/rest/interviews/:id/status', (req, res) => {
    const interview = state.interviews.find((item) => item.id === req.params.id);
    const status = req.body?.status;

    if (!interview) {
      return res.status(404).json({ error: 'INTERVIEW_NOT_FOUND', message: 'Interview was not found.' });
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`
      });
    }

    interview.status = status;
    return res.json({ interview: withCandidate(interview, state.candidates) });
  });

  app.post('/rest/interviews/:id/evaluate', (req, res) => {
    const interview = state.interviews.find((item) => item.id === req.params.id);
    const score = Number(req.body?.score);

    if (!interview) {
      return res.status(404).json({ error: 'INTERVIEW_NOT_FOUND', message: 'Interview was not found.' });
    }

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: 'INVALID_SCORE', message: 'score must be a number from 0 to 100.' });
    }

    interview.score = score;
    interview.status = 'COMPLETED';
    interview.recommendation = score >= 75 ? 'HIRE' : score >= 55 ? 'REVIEW' : 'NO_HIRE';

    return res.json({ interview: withCandidate(interview, state.candidates) });
  });

  app.get('/rest/candidates/:id', (req, res) => {
    const candidate = state.candidates.find((item) => item.id === req.params.id);

    if (!candidate) {
      return res.status(404).json({ error: 'CANDIDATE_NOT_FOUND', message: 'Candidate was not found.' });
    }

    return res.json({ candidate });
  });

  app.get('/soap', (req, res) => {
    if (!('wsdl' in req.query)) {
      return res.type('text/plain').send('SOAP endpoint is available. Use /soap?wsdl for WSDL.');
    }

    return res.type('application/xml').send(wsdlXml(publicBaseUrl(req)));
  });

  app.post('/soap', (req, res) => {
    let operationName;
    let payload;

    try {
      const xml = typeof req.body === 'string' ? req.body : '';

      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
        return res.status(400).type('application/xml').send(soapFault('DTD and entity declarations are not supported.', 'UNSAFE_XML'));
      }

      const parsed = parser.parse(xml);
      const body = parsed?.Envelope?.Body;

      if (!body || typeof body !== 'object') {
        throw new Error('SOAP Body is missing.');
      }

      operationName = Object.keys(body).find((key) => key !== 'Fault');
      payload = body[operationName] || {};
    } catch (error) {
      return res.status(400).type('application/xml').send(soapFault('Malformed SOAP envelope.', error.message));
    }

    if (operationName === 'ListInterviewsRequest' || operationName === 'ListInterviews') {
      return res.type('application/xml').send(soapEnvelope('ListInterviewsResponse', {
        interviews: { interview: state.interviews.map((interview) => withCandidate(interview, state.candidates)) }
      }));
    }

    if (operationName === 'GetInterviewRequest' || operationName === 'GetInterview') {
      const interview = state.interviews.find((item) => item.id === payload.id);

      if (!interview) {
        return res.status(404).type('application/xml').send(soapFault('Interview was not found.', 'INTERVIEW_NOT_FOUND'));
      }

      return res.type('application/xml').send(soapEnvelope('GetInterviewResponse', {
        interview: withCandidate(interview, state.candidates)
      }));
    }

    if (operationName === 'CreateInterviewRequest' || operationName === 'CreateInterview') {
      const candidate = state.candidates.find((item) => item.id === payload.candidateId);

      if (!candidate) {
        return res.status(400).type('application/xml').send(soapFault('candidateId must match an existing candidate.', 'UNKNOWN_CANDIDATE'));
      }

      const interview = {
        id: nextInterviewId(state.interviews),
        candidateId: payload.candidateId,
        position: payload.position || 'Software Engineer',
        scheduledAt: payload.scheduledAt || new Date().toISOString(),
        status: 'SCHEDULED',
        score: null,
        recommendation: null
      };

      state.interviews.push(interview);
      return res.type('application/xml').send(soapEnvelope('CreateInterviewResponse', {
        interview: withCandidate(interview, state.candidates)
      }));
    }

    if (operationName === 'UpdateInterviewStatusRequest' || operationName === 'UpdateInterviewStatus') {
      const interview = state.interviews.find((item) => item.id === payload.id);

      if (!interview) {
        return res.status(404).type('application/xml').send(soapFault('Interview was not found.', 'INTERVIEW_NOT_FOUND'));
      }

      if (!ALLOWED_STATUSES.has(payload.status)) {
        return res.status(400).type('application/xml').send(soapFault('Invalid status.', 'INVALID_STATUS'));
      }

      interview.status = payload.status;
      return res.type('application/xml').send(soapEnvelope('UpdateInterviewStatusResponse', {
        interview: withCandidate(interview, state.candidates)
      }));
    }

    return res.status(400).type('application/xml').send(soapFault(`Unsupported SOAP operation: ${operationName || 'unknown'}`));
  });

  app.use((req, res) => {
    res.status(404).json({
      error: 'ROUTE_NOT_FOUND',
      message: `${req.method} ${req.path} is not defined in ${SERVICE_NAME}.`
    });
  });

  app.use((error, _req, res, _next) => {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  app.listen(port, () => {
    console.log(`${SERVICE_NAME} listening on http://localhost:${port}`);
  });
}

module.exports = app;
