# Codex handoff

## Stav projektu

Projekt `/Users/tm/workspaces/projects/interview` byl překopaný z původního
interview/candidate mocku na jednodušší doménu knih:

- `server/` je serverová část.
- `client/` je část pro uchazeče.
- `sql/` je samostatná SQL část.

Staré věci jako `docs/`, `dashboard/`, `postman/`, `soapui/`, původní
`mocks/`, `candidate/`, staré PDF a `sql/interview.db` byly smazané.

## Server

Hlavní server je `server/server.js` (přesunuto z rootu kvůli čisté
server/client separaci). `npm start` ho spouští transparentně.

Aktuální doména:

- knihy: `/rest/books`
- výpůjčky: `/rest/loans`
- SOAP výpůjčky: `ListLoans`, `GetLoan`, `CreateLoan`, `UpdateLoanStatus`, `ReviewLoan`

Dokumentace služeb:

- `http://localhost:4010/services`
- `http://localhost:4010/swagger`
- `http://localhost:4010/openapi-books.yaml`
- `http://localhost:4010/openapi-loans.yaml`
- `http://localhost:4010/soap?wsdl`

Přístupy:

- REST token: `BOOKS-REST-TOKEN-2026`
- SOAP user: `books-user`
- SOAP password: `Books!2026`

## Client

Client část je v `client/`:

- `client/zadani.html` – kompletní zadání (jen HTML): úlohy nahoře,
  přístupy, definice služeb, SQL včetně změny dat, závěrečná diskuze
- `client/sluzby.html` – jednoduchý rozcestník (odkazy + přístupy)

Tohle je část, kterou má vidět uchazeč.

## SQL

SQL část je v `sql/`:

- `sql/schema.sql`
- `sql/seed.sql`
- `sql/examples.sql`
- `sql/books.db`
- `sql/build.sh`

Databáze je samostatná, není napojená na REST/SOAP server.

Rebuild:

```bash
cd sql
./build.sh
```

Smoke test:

```bash
sqlite3 -header -column sql/books.db < sql/examples.sql
```

## Balení

`scripts/build-packages.js` teď vytváří:

- serverové balíčky `books-mock-server-*`
- klientský balíček `books-mock-client.zip`
- Windows installer, pokud je dostupný `makensis`

Poznámka: V předchozí sandbox session `npm run package` nemohlo stáhnout pkg
runtime binárky kvůli zablokované síti. V plné Codex session nebo lokálně s
internetem by to mělo doběhnout.

## Ověření provedené v sandboxu

Prošlo:

```bash
node --check server/server.js
node --check scripts/build-packages.js
./sql/build.sh
sqlite3 -header -column sql/books.db < sql/examples.sql
```

`npm test` v sandboxu neprošlo, protože sandbox neumožnil bindnout lokální TCP
port. To je limit prostředí, ne nutně chyba aplikace.

## Další krok v nové Codex session

Spustit novou session s plným přístupem, dobalit artefakty a případně je
zkopírovat na Windows plochu nebo do sdílené složky VM.
