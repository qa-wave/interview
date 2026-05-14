# Praktický test: Integrační tester

## O čem to je

Před vámi běží mock služba **Interview Mock**, která simuluje správu pohovorů a kandidátů. Nabízí **REST API** (JSON) i **SOAP webovou službu** (XML). Každé rozhraní používá jiný typ zabezpečení.

Vyberte si nástroj — **Postman**, **SoapUI** nebo oba — a splňte úlohy níže. Není nutné provolávat všechny endpointy, důležité je prokázat, že umíte pracovat s oběma protokoly a s předáváním dat mezi volánami.

**Časový limit:** 70 minut

---

## Přístupy ke službě

| Co | URL |
|---|---|
| Swagger (OpenAPI) | `http://localhost:4010/openapi.yaml` |
| WSDL | `http://localhost:4010/soap?wsdl` |

### REST — Bearer token

REST API vyžaduje hlavičku `Authorization` s Bearer tokenem:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.CEPS-HUB-INTERVIEW-2026
```

### SOAP — WS-Security UsernameToken

SOAP služba vyžaduje WS-Security hlavičku v SOAP Envelope s těmito údaji:

| Parametr | Hodnota |
|---|---|
| Username | `ceps-integration` |
| Password | `K7x!mQ9pL2wZ` |

Příklad SOAP Header:

```xml
<soap:Header>
  <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
    <wsse:UsernameToken>
      <wsse:Username>ceps-integration</wsse:Username>
      <wsse:Password>K7x!mQ9pL2wZ</wsse:Password>
    </wsse:UsernameToken>
  </wsse:Security>
</soap:Header>
```

---

## Úloha 1: REST API s Bearer autentizací (25 minut)

Otevřete si Swagger specifikaci (`/openapi.yaml`) a projděte dostupné endpointy.

**a) Ověřte zabezpečení**
- Zavolejte `GET /rest/interviews` **bez** tokenu — měli byste dostat `401`.
- Zavolejte totéž **s** Bearer tokenem — měli byste dostat `200` a seznam pohovorů.

**b) Získejte detail pohovoru**
- Zavolejte `GET /rest/interviews/INT-001`. Ověřte, že odpověď obsahuje informace o kandidátovi (jméno, email, skills).

**c) Vytvořte nový pohovor a proveďte jeho lifecycle**
1. Vytvořte pohovor (`POST /rest/interviews`) pro kandidáta `CAND-002` na pozici `Integration Tester`.
2. Z odpovědi **si uložte `id`** nového pohovoru — budete ho potřebovat dál.
3. Změňte status pohovoru na `IN_PROGRESS` (`PATCH /rest/interviews/{id}/status`).
4. Ohodnoťte pohovor skóre `72` (`POST /rest/interviews/{id}/evaluate`).
5. Ověřte, že se v odpovědi změnil `status` na `COMPLETED` a `recommendation` odpovídá skóre.

**d) Vyzkoušejte chybový scénář**
- Zkuste získat neexistující pohovor (`INT-999`), nebo odeslat nevalidní skóre (`150`). Jaký status kód a chybovou zprávu server vrátí?

---

## Úloha 2: SOAP API s WS-Security (25 minut)

Otevřete si WSDL definici (`/soap?wsdl`) a prostudujte dostupné operace.

**a) Ověřte zabezpečení**
- Odešlete SOAP request **bez** WS-Security hlavičky — měli byste dostat SOAP Fault s kódem `AUTHENTICATION_REQUIRED`.
- Odešlete stejný request **s** WS-Security (username + password) — měl by projít.

**b) Načtěte pohovory**
- Zavolejte operaci `ListInterviews`. Ověřte, že odpověď obsahuje XML se seznamem pohovorů.

**c) Vytvořte pohovor přes SOAP a ověřte přes REST**
1. Vytvořte pohovor pomocí operace `CreateInterview` (kandidát `CAND-001`, pozice `SOAP Tester`).
2. Z odpovědi si poznamenejte `id` nového pohovoru.
3. **Přepněte se do RESTu** — zavolejte `GET /rest/interviews/{id}` a ověřte, že pohovor vytvořený přes SOAP je viditelný i přes REST API. To dokazuje, že obě rozhraní sdílejí stejná data.

**d) Změňte stav přes SOAP**
- Pomocí operace `UpdateInterviewStatus` změňte status pohovoru na `CANCELLED`.

---

## Úloha 3: SQL (10 minut)

Na ploše najdete SQLite databázi `sql/interview.db` se schématem popsaným v `sql/schema.sql`. Databáze obsahuje tabulky `companies`, `positions`, `candidates`, `skills`, `candidate_skills`, `interviews`, `evaluations` a `interview_status_history`.

Otevřete terminál a spusťte `sqlite3 sql/interview.db`. Napište SQL dotazy pro následující úlohy:

**a)** Vypište jména a emaily všech kandidátů, kteří mají skill `SOAP` na úrovni `expert`.

**b)** Kolik pohovorů je v jednotlivých stavech? Výsledek by měl mít sloupce `status` a `pocet`.

**c)** Vypište kandidáty, kteří **nemají žádný** naplánovaný pohovor (tzn. neexistuje záznam v tabulce `interviews` pro jejich `id`).

**d)** Pro každého kandidáta, který má alespoň jeden dokončený pohovor (`COMPLETED`), vypište jeho jméno a **průměrné skóre** zaokrouhlené na celé číslo. Seřaďte sestupně podle průměru.
