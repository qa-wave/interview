# Řešení / walkthrough pro zkoušejícího

> Není určeno uchazeči. Slouží jako referenční průběh a očekávané výsledky
> ke `client/zadani.html`.

## Příprava

```bash
cd interview
npm start            # http://localhost:4010
```

Stav je v paměti. Čistý reset = `Ctrl-C` + `npm start`.

Pomocná proměnná:

```bash
T="Authorization: Bearer BOOKS-REST-TOKEN-2026"
```

## Úkol 1 – orientace v definicích

- Swagger UI: <http://localhost:4010/swagger>
- WSDL: <http://localhost:4010/soap?wsdl>

Cíl: uchazeč pozná REST operace (`/rest/books`, `/rest/loans`) a SOAP
operace (`ListLoans`, `GetLoan`, `CreateLoan`, `UpdateLoanStatus`,
`ReviewLoan`). Žádné volání se zatím nehodnotí.

## Úkol 2 – najdi knihu přes REST

```bash
curl -s -H "$T" "http://localhost:4010/rest/books?isbn=978-80-000-0002-8"
```

Očekáváno: `books[0].id = BOOK-002` (kniha „SOAP a REST v praxi“,
kategorie Integration). Uchazeč si uloží `bookId`.

## Úkol 3 – vytvoř a posuň výpůjčku

```bash
curl -s -H "$T" -H "content-type: application/json" -X POST \
  -d '{"bookId":"BOOK-002","borrowerName":"QA Candidate"}' \
  http://localhost:4010/rest/loans
```

Očekáváno: `201`, `loan.id = LOAN-002`, `loan.status = REQUESTED`.

```bash
curl -s -H "$T" -H "content-type: application/json" -X PATCH \
  -d '{"status":"BORROWED"}' \
  http://localhost:4010/rest/loans/LOAN-002/status
```

Očekáváno: `200`, `loan.status = BORROWED`.

Negativní scénář (stačí jeden):

| Scénář | Požadavek | Očekáváno |
|---|---|---|
| Neexistující kniha | `POST /rest/loans { "bookId": "BOOK-999" }` | `400 BOOK_NOT_FOUND` |
| Nedostupná kniha | `POST /rest/loans { "bookId": "BOOK-003" }` | `400 BOOK_NOT_AVAILABLE` |
| Neplatný status | `PATCH /rest/loans/LOAN-002/status { "status": "XXX" }` | `400` / chyba přechodu |

## Úkol 4 – ověř stav přes SOAP a uzavři druhým protokolem

```bash
curl -s -X POST -H "Content-Type: text/xml" --data '<soap:Envelope
 xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
 xmlns:tns="urn:books-mock"
 xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
 <soap:Header><wsse:Security><wsse:UsernameToken>
   <wsse:Username>books-user</wsse:Username>
   <wsse:Password>Books!2026</wsse:Password>
 </wsse:UsernameToken></wsse:Security></soap:Header>
 <soap:Body><tns:GetLoanRequest><tns:id>LOAN-002</tns:id></tns:GetLoanRequest></soap:Body>
</soap:Envelope>' http://localhost:4010/soap
```

Očekáváno: SOAP odpověď `<status>BORROWED</status>` – důkaz sdíleného
stavu (výpůjčka vznikla přes REST, čtená přes SOAP).

```bash
curl -s -H "$T" -H "content-type: application/json" -X POST \
  -d '{"rating":5}' http://localhost:4010/rest/loans/LOAN-002/review
```

Očekáváno: `loan.status = RETURNED`, `loan.recommendation = RECOMMENDED`.
Křížové ověření: opětovný SOAP `GetLoan` vrací `RETURNED` / `RECOMMENDED`.

## Úkol 5 – SQL včetně změny dat

```bash
sqlite3 -header -column sql/books.db
```

```sql
-- 1) dostupné knihy v kategorii Integration
SELECT id, title, author FROM books
WHERE category = 'Integration' AND available = 1;
-- očekáváno: 1 řádek (BOOK-002)

-- 2) počty výpůjček podle statusu
SELECT status, COUNT(*) AS pocet
FROM loans GROUP BY status ORDER BY pocet DESC;

-- 3) změna dat
UPDATE books SET available = 0 WHERE category = 'Testing';
SELECT changes() AS zmeneno;                                  -- očekáváno: 2
SELECT COUNT(*) AS dostupne_testing
FROM books WHERE category = 'Testing' AND available = 1;       -- očekáváno: 0
```

Obnova databáze: `cd sql && ./build.sh`.

## Závěrečná diskuze – na co se ptát

1. Co ověřil v REST, co v SOAP.
2. Rozdíl Bearer token vs WS-Security UsernameToken
   (HTTP hlavička vs. credentials uvnitř SOAP XML hlavičky).
3. Jak ověřil dopad `UPDATE` (`changes()` + kontrolní `SELECT`).
4. Co by automatizoval (celý řetěz create → patch → GetLoan → review
   s assertions a předáváním `loanId`).
