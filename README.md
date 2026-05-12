# Interview Mock

REST and SOAP mock services for interview testing.

## Run Locally

```bash
npm install
npm start
```

Default URL:

```text
http://localhost:4010
```

Environment variables:

- `PORT`: server port, default `4010`
- `MOCK_DATA_PATH`: optional path to a JSON file with `candidates` and `interviews`

## Test Tool Inputs

Use these values in Postman, SoapUI, ReadyAPI, JMeter, Bruno, curl, or another test tool:

- Base URL: `http://localhost:4010`
- Healthcheck: `GET /health`
- OpenAPI: `GET /openapi.yaml`
- REST root: `GET /rest`
- SOAP endpoint: `POST /soap`
- SOAP WSDL: `GET /soap?wsdl`
- Postman collection: `postman/interview-mock.postman_collection.json`
- HTTP examples: `docs/test-requests.http`
- SOAP examples: `docs/soap-create-interview.xml`, `docs/soap-update-status.xml`

## REST Examples

```bash
curl http://localhost:4010/health
curl http://localhost:4010/rest/interviews
curl http://localhost:4010/rest/interviews/INT-001
```

```bash
curl -X POST http://localhost:4010/rest/interviews \
  -H 'content-type: application/json' \
  -d '{"candidateId":"CAND-001","position":"QA Automation Engineer","scheduledAt":"2026-05-21T10:00:00.000Z"}'
```

```bash
curl -X PATCH http://localhost:4010/rest/interviews/INT-001/status \
  -H 'content-type: application/json' \
  -d '{"status":"IN_PROGRESS"}'
```

## SOAP Example

```bash
curl -X POST http://localhost:4010/soap \
  -H 'content-type: text/xml; charset=utf-8' \
  -H 'SOAPAction: urn:interview-mock#GetInterview' \
  --data-binary @- <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:interview-mock">
  <soap:Body>
    <tns:GetInterviewRequest>
      <tns:id>INT-001</tns:id>
    </tns:GetInterviewRequest>
  </soap:Body>
</soap:Envelope>
XML
```

Supported SOAP operations:

- `ListInterviewsRequest`
- `GetInterviewRequest`
- `CreateInterviewRequest`
- `UpdateInterviewStatusRequest`

## Build Packages

```bash
npm install
npm run package
```

Generated archives:

- `dist/packages/interview-mock-macos-arm64.zip`
- `dist/packages/interview-mock-macos-x64.zip`
- `dist/packages/interview-mock-windows-x64.zip`

Each archive contains a standalone executable, mock data, request examples, and a start script.

## Deploy to Vercel

```bash
vercel --prod --yes
```

After deployment, use the deployment URL as the base URL and the same paths listed above.
