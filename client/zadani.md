# Praktický test: integrační tester

Časový limit praktické části je 60 minut. Server běží na `http://localhost:4010`.

## Zadání

1. Projdi si **definice služeb** (Swagger UI pro REST, WSDL pro SOAP) v sekci níže a zorientuj se v obou rozhraních.
2. Najdi knihu podle ISBN `978-80-000-0002-8` přes REST a ulož si `bookId` z odpovědi.
3. Vytvoř výpůjčku přes `POST /rest/loans` pro tuto knihu, `borrowerName` = `QA Candidate`. Ulož si `loanId` a změň status na `BORROWED` přes `PATCH /rest/loans/{id}/status`. Vyzkoušej jeden negativní scénář (neexistující kniha, nedostupná kniha, nebo neplatný status).
4. Přes SOAP operaci `GetLoan` (s WS-Security) ověř, že stejná výpůjčka má status `BORROWED`. Poté ji ohodnoť ratingem `5` a **druhým protokolem** ověř, že `status = RETURNED` a `recommendation = RECOMMENDED`.
5. Splnit SQL část níže (včetně změny dat).
6. Připravit si závěrečnou diskuzi (sekce úplně dole).

## Přístupy

| Kde | Hodnota |
|---|---|
| REST | `Authorization: Bearer BOOKS-REST-TOKEN-2026` |
| SOAP username | `books-user` |
| SOAP password | `Books!2026` |

## Definice služeb

| Co | Odkaz |
|---|---|
| REST — Swagger UI | <http://localhost:4010/swagger> |
| SOAP — WSDL | <http://localhost:4010/soap?wsdl> |

Swagger UI je interaktivní prohlížeč REST API (knihy `/rest/books`, výpůjčky `/rest/loans`) — jde z něj i posílat requesty. WSDL je kontrakt SOAP služby nad výpůjčkami: operace `ListLoans`, `GetLoan`, `CreateLoan`, `UpdateLoanStatus`, `ReviewLoan`. Raw OpenAPI je případně na `/openapi.yaml`.

## SQL

SQLite databáze `books.db` je samostatný dataset, není napojená na běžící REST/SOAP mock. Otevři **SQL konzoli v prohlížeči**: <http://localhost:4010/sql> (píše se do ní rovnou, není potřeba nic instalovat).

Napiš a spusť dotazy:

1. **Vypiš** dostupné knihy v kategorii `Integration` (sloupce `id`, `title`, `author`).
2. **Spočítej** počet výpůjček podle statusu, výstup pojmenuj `status` a `pocet`, seřaď sestupně podle `pocet`.
3. **Změň data:** označ všechny knihy v kategorii `Testing` jako nedostupné (`available = 0`) jedním `UPDATE` dotazem. Pak `SELECT`em ověř, že v kategorii `Testing` už není žádná dostupná kniha. Kolik řádků `UPDATE` změnil?

Cíl: `SELECT`, `WHERE`, `GROUP BY`, `COUNT` a `UPDATE` včetně ověření dopadu změny.

## Závěrečná diskuze

Stručně popiš:

1. Co jsi ověřil/a v REST části a co v SOAP části.
2. Jak se liší **Bearer token** a **WS-Security UsernameToken**.
3. Jak jsi v SQL ověřil/a, že změna dat (`UPDATE`) měla správný dopad.
4. Co bys z tohoto flow automatizoval/a a jak.
