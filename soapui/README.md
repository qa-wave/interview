# SoapUI projekt — Interview Mock

SoapUI projekt pokrývající stejnou plochu jako [`postman/`](../postman/) collection:
**Auth & Security**, **REST**, **SOAP**. Implementováno přes Groovy test steps,
takže nepotřebuje předem importovaný WSDL/REST interface a běží 1:1 stejně
v GUI i přes `testrunner.sh`.

## Soubory

| Soubor | Co je v něm |
|---|---|
| `InterviewMock-soapui-project.xml` | Projekt: 3 test suite, 18 test cases |
| `reports/` | Výstup `testrunner.sh -j -f reports/` (vytvoří se při běhu) |

## Test suites

| Suite | Test case | Co ověřuje |
|---|---|---|
| AuthSecurity | Healthcheck-no-auth | `GET /health` 200 bez klíče |
| AuthSecurity | WSDL-no-auth | `GET /soap?wsdl` 200, obsahuje všechny 4 operace |
| AuthSecurity | REST-without-key | `GET /rest/interviews` — spec 401, mock zatím 200 (warn) |
| AuthSecurity | REST-with-readonly-key | `GET /rest/interviews` se `readonly-key-2026` → 200 |
| AuthSecurity | REST-create-with-readonly | `POST /rest/interviews` se `readonly-key-2026` — spec 403, mock 201 (warn) |
| RestSuite | REST-list | `GET /rest/interviews` |
| RestSuite | REST-list-filtered | `?status=SCHEDULED` filtr |
| RestSuite | REST-get-detail | `GET /rest/interviews/INT-001` |
| RestSuite | REST-get-missing-404 | `GET /rest/interviews/INT-999` → 404 + "not found" |
| RestSuite | REST-create-and-lifecycle | POST → PATCH IN_PROGRESS → POST evaluate(91) ⇒ HIRE |
| RestSuite | REST-candidate | `GET /rest/candidates/CAND-001` |
| RestSuite | REST-search-by-skill | `GET /rest/candidates?skill=SQL` — informativní (mock nemá impl) |
| SoapSuite | SOAP-ListInterviews | `ListInterviewsResponse`, obsahuje `INT-001` |
| SoapSuite | SOAP-GetInterview-INT001 | `GetInterviewResponse`, `<id>INT-001</id>`, `<position>` |
| SoapSuite | SOAP-GetInterview-INT002 | logování `<score>` a `<recommendation>` |
| SoapSuite | SOAP-GetInterview-missing | INT-999 → 404 Fault `INTERVIEW_NOT_FOUND` |
| SoapSuite | SOAP-CreateInterview | `<status>SCHEDULED</status>`, `<position>SOAP Tester</position>` |
| SoapSuite | SOAP-CreateInterview-bad-candidate | CAND-XXX → 400 Fault `UNKNOWN_CANDIDATE` |
| SoapSuite | SOAP-UpdateInterviewStatus | INT-001 → IN_PROGRESS |
| SoapSuite | SOAP-UpdateInterviewStatus-invalid | BOGUS → 400 Fault `INVALID_STATUS` |

## Spuštění z terminálu

> **Pozor:** SoapUI 5.9.1 obsahuje Groovy 2, který neumí načítat class files
> Java ≥ 21 (`Unsupported class file major version 66`). `testrunner.sh` má
> rozbitou detekci bundled JRE — explicitně nastavte `PATH` na vnitřní JRE 17.

```bash
JAVA_HOME=/Applications/SoapUI-5.9.1.app/Contents/PlugIns/jre.bundle/Contents/Home \
PATH=$JAVA_HOME/bin:$PATH \
/Applications/SoapUI-5.9.1.app/Contents/java/app/bin/testrunner.sh \
  -j -f soapui/reports soapui/InterviewMock-soapui-project.xml
```

Před spuštěním nechte běžet mock: `npm start` v rootu (default `http://localhost:4010`).

## V GUI

Otevřete projekt přes **File → Import Project** a vyberte tento XML. Všechny
test cases lze pustit klikem na zelený "play" u kořenového projektu nebo
u jednotlivé suite.
