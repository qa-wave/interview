# Reseni / walkthrough pro zkousejiciho

> Neni urceno uchazeci. Slouzi jako referencni prubeh a ocekavane vysledky
> ke `client/zadani.html`.

## Priprava

```bash
cd interview
npm start            # http://localhost:4010
```

Stav je v pameti. Cisty reset = `Ctrl-C` + `npm start`.

Pomocna promenna:

```bash
T="Authorization: Bearer BOOKS-REST-TOKEN-2026"
```

## Ukol 1 - orientace v definicich

- Swagger UI: <http://localhost:4010/swagger>
- WSDL: <http://localhost:4010/soap?wsdl>

Cil: uchazec pozna REST operace (`/rest/books`, `/rest/loans`) a SOAP
operace (`ListLoans`, `GetLoan`, `CreateLoan`, `UpdateLoanStatus`,
`ReviewLoan`). Zadne volani se zatim nehodnoti.

## Ukol 2 - najdi knihu pres REST

```bash
curl -s -H "$T" "http://localhost:4010/rest/books?isbn=978-80-000-0002-8"
```

Ocekavano: `books[0].id = BOOK-002` (kniha "SOAP a REST v praxi",
kategorie Integration). Uchazec si ulozi `bookId`.

## Ukol 3 - vytvor a posun vypujcku

```bash
curl -s -H "$T" -H "content-type: application/json" -X POST \
  -d '{"bookId":"BOOK-002","borrowerName":"QA Candidate"}' \
  http://localhost:4010/rest/loans
```

Ocekavano: `201`, `loan.id = LOAN-002`, `loan.status = REQUESTED`.

```bash
curl -s -H "$T" -H "content-type: application/json" -X PATCH \
  -d '{"status":"BORROWED"}' \
  http://localhost:4010/rest/loans/LOAN-002/status
```

Ocekavano: `200`, `loan.status = BORROWED`.

Negativni scenar (staci jeden):

| Scenar | Pozadavek | Ocekavano |
|---|---|---|
| Neexistujici kniha | `POST /rest/loans { "bookId": "BOOK-999" }` | `400 BOOK_NOT_FOUND` |
| Nedostupna kniha | `POST /rest/loans { "bookId": "BOOK-003" }` | `400 BOOK_NOT_AVAILABLE` |
| Neplatny status | `PATCH /rest/loans/LOAN-002/status { "status": "XXX" }` | `400` / chyba prechodu |

## Ukol 4 - over stav pres SOAP a uzavri druhym protokolem

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

Ocekavano: SOAP odpoved `<status>BORROWED</status>` - dukaz sdileneho
stavu (vypujcka vznikla pres REST, ctena pres SOAP).

```bash
curl -s -H "$T" -H "content-type: application/json" -X POST \
  -d '{"rating":5}' http://localhost:4010/rest/loans/LOAN-002/review
```

Ocekavano: `loan.status = RETURNED`, `loan.recommendation = RECOMMENDED`.
Krizove overeni: opetovny SOAP `GetLoan` vraci `RETURNED` / `RECOMMENDED`.

## Ukol 5 - SQL vcetne zmeny dat

```bash
sqlite3 -header -column sql/books.db
```

```sql
-- 1) dostupne knihy v kategorii Integration
SELECT id, title, author FROM books
WHERE category = 'Integration' AND available = 1;
-- ocekavano: 1 radek (BOOK-002)

-- 2) pocty vypujcek podle statusu
SELECT status, COUNT(*) AS pocet
FROM loans GROUP BY status ORDER BY pocet DESC;

-- 3) zmena dat
UPDATE books SET available = 0 WHERE category = 'Testing';
SELECT changes() AS zmeneno;                                  -- ocekavano: 2
SELECT COUNT(*) AS dostupne_testing
FROM books WHERE category = 'Testing' AND available = 1;       -- ocekavano: 0
```

Obnova databaze: `cd sql && ./build.sh`.

## Zaverecna diskuze - na co se ptat

1. Co overil v REST, co v SOAP.
2. Rozdil Bearer token vs WS-Security UsernameToken
   (HTTP hlavicka vs. credentials uvnitr SOAP XML hlavicky).
3. Jak overil dopad `UPDATE` (`changes()` + kontrolni `SELECT`).
4. Co by automatizoval (cely retez create -> patch -> GetLoan -> review
   s assertions a predavanim `loanId`).
