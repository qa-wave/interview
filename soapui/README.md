# SoapUI projekt — Interview Mock

SoapUI projekt s Groovy test steps pro REST (Bearer token) a SOAP (WS-Security).

## Autentizace

| Protokol | Typ | Údaje |
|---|---|---|
| REST | Bearer token | `Authorization: Bearer eyJhbGciOiJSUzI1NiIs...CEPS-HUB-INTERVIEW-2026` |
| SOAP | WS-Security UsernameToken | username: `ceps-integration`, password: `K7x!mQ9pL2wZ` |

## Test suites

| Suite | Test case | Co ověřuje |
|---|---|---|
| RestSuite | REST-list-interviews | `GET /rest/interviews` s Bearer → 200 |
| RestSuite | REST-get-interview | `GET /rest/interviews/INT-001` → detail s kandidátem |
| RestSuite | REST-no-auth-401 | `GET /rest/interviews` bez tokenu → 401 |
| RestSuite | REST-create-and-lifecycle | POST → PATCH IN_PROGRESS → evaluate(82) → HIRE |
| SoapSuite | SOAP-wsdl | `GET /soap?wsdl` → 200, bez autentizace |
| SoapSuite | SOAP-no-auth-401 | POST bez WS-Security → 401 |
| SoapSuite | SOAP-list-interviews | ListInterviews s WS-Security → 200 |
| SoapSuite | SOAP-get-interview | GetInterview INT-002 → score 82, HIRE |

## Spuštění

```bash
# Nejdřív spusťte mock server
npm start

# Pak v jiném terminálu
/Applications/SoapUI-5.9.1.app/Contents/java/app/bin/testrunner.sh \
  -j -f soapui/reports soapui/InterviewMock-soapui-project.xml
```

V GUI: **File → Import Project** → vyberte `InterviewMock-soapui-project.xml`.
