# Codex handoff

## Stav projektu

Projekt `/Users/tm/workspaces/projects/interview` byl prekopany z puvodniho
interview/candidate mocku na jednodussi domenu knih:

- `server/` je serverova cast.
- `client/` je cast pro uchazece.
- `sql/` je samostatna SQL cast.

Stare veci jako `docs/`, `dashboard/`, `postman/`, `soapui/`, puvodni
`mocks/`, `candidate/`, stare PDF a `sql/interview.db` byly smazane.

## Server

Hlavni server je `server/server.js` (presunuto z rootu kvuli ciste
server/client separaci). `npm start` ho spousti transparentne.

Aktualni domena:

- knihy: `/rest/books`
- vypujcky: `/rest/loans`
- SOAP vypujcky: `ListLoans`, `GetLoan`, `CreateLoan`, `UpdateLoanStatus`, `ReviewLoan`

Dokumentace sluzeb:

- `http://localhost:4010/services`
- `http://localhost:4010/swagger`
- `http://localhost:4010/openapi-books.yaml`
- `http://localhost:4010/openapi-loans.yaml`
- `http://localhost:4010/soap?wsdl`

Pristupy:

- REST token: `BOOKS-REST-TOKEN-2026`
- SOAP user: `books-user`
- SOAP password: `Books!2026`

## Client

Client cast je v `client/`:

- `client/zadani.html` - kompletni zadani (jen HTML): ulohy nahore,
  pristupy, definice sluzeb, SQL vcetne zmeny dat, zaverecna diskuze
- `client/sluzby.html` - jednoduchy rozcestnik (odkazy + pristupy)

Tohle je cast, kterou ma videt uchazec.

## SQL

SQL cast je v `sql/`:

- `sql/schema.sql`
- `sql/seed.sql`
- `sql/examples.sql`
- `sql/books.db`
- `sql/build.sh`

Databaze je samostatna, neni napojena na REST/SOAP server.

Rebuild:

```bash
cd sql
./build.sh
```

Smoke test:

```bash
sqlite3 -header -column sql/books.db < sql/examples.sql
```

## Baleni

`scripts/build-packages.js` ted vytvari:

- serverove balicky `books-mock-server-*`
- klientsky balicek `books-mock-client.zip`
- Windows installer, pokud je dostupny `makensis`

Poznamka: V predchozi sandbox session `npm run package` nemohlo stahnout pkg
runtime binarky kvuli zablokovane siti. V plne Codex session nebo lokalne s
internetem by to melo dobehnout.

## Overeni provedene v sandboxu

Proslo:

```bash
node --check server/server.js
node --check scripts/build-packages.js
./sql/build.sh
sqlite3 -header -column sql/books.db < sql/examples.sql
```

`npm test` v sandboxu neproslo, protoze sandbox neumoznil bindnout lokalni TCP
port. To je limit prostredi, ne nutne chyba aplikace.

## Dalsi krok v nove Codex session

Spustit novou session s plnym pristupem, dobalit artefakty a pripadne je
zkopirovat na Windows plochu nebo do sdilene slozky VM.
