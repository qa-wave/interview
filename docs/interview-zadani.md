# Praktický test: Integrační tester

## O čem to je

Před vámi běží 4 mock služby simulující správu pohovorů a kandidátů. Služby spolu sdílejí data — výstup jedné služby je vstupem další. Vaším úkolem je provolat celý flow od nalezení kandidáta až po ověření jeho hodnocení, a to napříč REST i SOAP rozhraními.

Vyberte si nástroj — **Postman**, **SoapUI** nebo oba.

**Časový limit:** 60 minut

---

## Služby

Otevřete si dashboard: **http://localhost:4010/dashboard** — najdete tam seznam služeb, přístupové údaje a specifikace (Swagger / WSDL).

| # | Služba | Protokol | Zabezpečení | Spec |
|---|---|---|---|---|
| 1 | **Candidates** | REST | Bearer token | `/openapi-candidates.yaml` |
| 2 | **Interviews** | REST | Bearer token | `/openapi-interviews.yaml` |
| 3 | **Interviews** | SOAP | WS-Security | `/soap?wsdl` |
| 4 | **Evaluations** | SOAP | WS-Security | `/soap?wsdl` |

### REST — Bearer token

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.CEPS-HUB-INTERVIEW-2026
```

### SOAP — WS-Security UsernameToken

| Parametr | Hodnota |
|---|---|
| Username | `ceps-integration` |
| Password | `K7x!mQ9pL2wZ` |

---

## Úloha 1: Najděte kandidáta (Candidates REST) — 10 minut

1. Prostudujte Swagger specifikaci služby Candidates.
2. Vyhledejte kandidáta podle emailu `petr.svoboda@example.test`.
3. Z odpovědi si **uložte jeho `id`** — budete ho potřebovat v další úloze.

---

## Úloha 2: Vytvořte pohovor (Interviews REST) — 15 minut

1. Prostudujte Swagger specifikaci služby Interviews.
2. Vytvořte pohovor (`POST /rest/interviews`) — použijte **`candidateId` z úlohy 1**, pozice `Integration Tester`.
3. Z odpovědi si **uložte `id` pohovoru**.
4. Změňte status pohovoru na `IN_PROGRESS` (`PATCH /rest/interviews/{id}/status`).
5. Vyzkoušejte chybový scénář — zkuste vytvořit pohovor pro neexistujícího kandidáta. Jaký status kód dostanete?

---

## Úloha 3: Ověřte přes SOAP (Interviews SOAP) — 15 minut

1. Prostudujte WSDL definici.
2. Zavolejte operaci `GetInterview` s **`id` pohovoru z úlohy 2**. Ověřte, že status je `IN_PROGRESS`.
3. Vytvořte **další** pohovor přes SOAP (`CreateInterview`) pro **stejného kandidáta** na pozici `SOAP Tester`.
4. Ověřte, že nově vytvořený pohovor je viditelný přes REST (`GET /rest/interviews/{id}`).

---

## Úloha 4: Ohodnoťte pohovor (Evaluations) — 10 minut

1. Ohodnoťte pohovor z úlohy 2 skóre `82` přes REST (`POST /rest/interviews/{id}/evaluate`).
2. Ověřte výsledek přes SOAP — zavolejte `GetInterview` a zkontrolujte, že `status` je `COMPLETED` a `recommendation` je `HIRE`.
3. Ohodnoťte pohovor z úlohy 3 skóre `45` a ověřte, že recommendation je `NO_HIRE`.

---

## Úloha 5: SQL — 10 minut

Na ploše najdete SQLite databázi `sql/interview.db`. Spusťte `sqlite3 sql/interview.db`.

**a)** Vypište kandidáty, kteří mají skill `SOAP` na úrovni `expert`.

**b)** Kolik pohovorů je v jednotlivých stavech? (`status`, `pocet`)

**c)** Vypište kandidáty bez pohovoru.

**d)** Pro kandidáty s dokončeným pohovorem vypište průměrné skóre (sestupně).
