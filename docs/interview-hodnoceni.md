# Hodnotící arch pro zkoušejícího

> **Pouze pro interní použití. Nesdílejte s uchazečem.**

## Příprava

1. `npm start` (port 4010)
2. Ověřte: `curl http://localhost:4010/health`
3. Připravte Postman a/nebo SoapUI
4. Předejte uchazeči `interview-zadani.pdf`

**Přístupové údaje (jsou v zadání):**

| Protokol | Zabezpečení | Údaje |
|---|---|---|
| REST | Bearer token | `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.CEPS-HUB-INTERVIEW-2026` |
| SOAP | WS-Security | username: `ceps-integration`, password: `K7x!mQ9pL2wZ` |

**Po restartu služby se data vrátí do výchozího stavu** (2 kandidáti, 2 pohovory).

---

## Úloha 1: REST API — očekávané odpovědi

**1a — Zabezpečení**
```
GET /rest/interviews (bez tokenu) → 401
{ "error": "UNAUTHORIZED", "message": "Missing Authorization header..." }

GET /rest/interviews (s Bearer tokenem) → 200
{ "interviews": [...] }
```

**1b — Detail**
```
GET /rest/interviews/INT-001 → 200
interview.candidate.firstName = "Anna"
interview.candidate.skills = ["JavaScript", "REST", "SQL"]
```

**1c — Lifecycle**
```
POST /rest/interviews { candidateId: "CAND-002", position: "Integration Tester" } → 201
  → interview.id = "INT-003"

PATCH /rest/interviews/INT-003/status { status: "IN_PROGRESS" } → 200

POST /rest/interviews/INT-003/evaluate { score: 72 } → 200
  → status = "COMPLETED", recommendation = "REVIEW" (72 je v rozmezí 55-74)
```

Prahové hodnoty pro recommendation:
- 75+ = HIRE
- 55-74 = REVIEW
- <55 = NO_HIRE

**1d — Chybový scénář**
```
GET /rest/interviews/INT-999 → 404, INTERVIEW_NOT_FOUND
POST /rest/interviews/INT-001/evaluate { score: 150 } → 400, INVALID_SCORE
```

---

## Úloha 2: SOAP API — očekávané odpovědi

**2a — Zabezpečení**
```
POST /soap (bez WS-Security) → 401, SOAP Fault: AUTHENTICATION_REQUIRED
POST /soap (s WS-Security)  → 200, odpověď na operaci
```

**2b — ListInterviews**
```xml
<tns:ListInterviewsRequest/> → ListInterviewsResponse s pohovory
```

**2c — CreateInterview + ověření přes REST**
```xml
<tns:CreateInterviewRequest>
  <tns:candidateId>CAND-001</tns:candidateId>
  <tns:position>SOAP Tester</tns:position>
</tns:CreateInterviewRequest>
→ CreateInterviewResponse, nové ID (INT-004 pokud INT-003 vzniklo v REST)
```

Klíčový krok: uchazeč přepne do REST a zavolá `GET /rest/interviews/{id}` — pokud vidí pohovor z SOAP, chápe sdílený stav.

**2d — UpdateInterviewStatus**
```xml
<tns:UpdateInterviewStatusRequest>
  <tns:id>INT-004</tns:id>
  <tns:status>CANCELLED</tns:status>
</tns:UpdateInterviewStatusRequest>
```

---

## Úloha 3: SQL — očekávané odpovědi

Databáze: `sqlite3 sql/interview.db`

**3a — Kandidáti se skillem SOAP na úrovni expert**
```sql
SELECT c.first_name, c.last_name, c.email
FROM candidates c
JOIN candidate_skills cs ON c.id = cs.candidate_id
JOIN skills s ON cs.skill_id = s.id
WHERE s.name = 'SOAP' AND cs.level = 'expert';
```
Výsledek: 2 záznamy (Felix Andersson, Felix Schmidt).

Hodnotit: uchazeč musí použít JOIN přes 3 tabulky (`candidates` → `candidate_skills` → `skills`).

**3b — Počty pohovorů podle stavů**
```sql
SELECT status, COUNT(*) AS pocet
FROM interviews
GROUP BY status
ORDER BY pocet DESC;
```
Výsledek: COMPLETED 24, SCHEDULED 16, FAILED 5, CANCELLED 3, IN_PROGRESS 2.

Hodnotit: zná GROUP BY + COUNT, volitelně ORDER BY.

**3c — Kandidáti bez pohovoru**
```sql
SELECT c.first_name, c.last_name
FROM candidates c
WHERE c.id NOT IN (SELECT DISTINCT candidate_id FROM interviews);
-- nebo LEFT JOIN + WHERE i.id IS NULL
```
Výsledek: 7 kandidátů.

Hodnotit: subquery nebo anti-join pattern. Obojí je správně.

**3d — Průměrné skóre dokončených pohovorů**
```sql
SELECT c.first_name, c.last_name, ROUND(AVG(i.score)) AS avg_score
FROM candidates c
JOIN interviews i ON c.id = i.candidate_id
WHERE i.status = 'COMPLETED' AND i.score IS NOT NULL
GROUP BY c.id
ORDER BY avg_score DESC;
```
Výsledek: 21 kandidátů, nejvyšší průměr ~95, nejnižší ~42.

Hodnotit: JOIN + WHERE + GROUP BY + agregační funkce + ORDER BY. Bonus za ošetření NULL.

---

## Bodování

### Praktická část (max. 60 bodů)

| Kritérium | Body |
|---|---|
| REST: Bearer token, provolání endpointů, lifecycle | 15 |
| REST: předávání ID mezi voláními | 5 |
| REST: negativní scénář | 5 |
| SOAP: WS-Security, provolání operací | 15 |
| SOAP→REST: cross-protocol ověření | 5 |
| SQL: dotazy 3a-3d | 15 |

### Diskuze (max. 20 bodů)

| Kritérium | Body |
|---|---|
| Rozdíl Bearer vs. WS-Security | 5 |
| Návrhy dalších testů | 5 |
| Postřehy a komunikace | 5 |
| Celkový dojem (samostatnost, orientace) | 5 |

### Celkové hodnocení

| Výsledek | Body |
|---|---|
| **Přijmout** | 55+ |
| **Zvážit** | 40-54 |
| **Nepřijmout** | < 40 |

---

## Na co se zaměřit při pozorování

**Zelené vlajky:**
- Nejdřív si přečte Swagger/WSDL, pak začne volat
- Po vytvoření pohovoru si uloží ID do proměnné (ne copy-paste)
- V SOAP správně nastaví WS-Security namespace a UsernameToken
- Sám od sebe zkusí cross-protocol test (REST ↔ SOAP)
- Umí interpretovat SOAP Fault (přečte faultstring, detail)
- Pojmenovává requesty, organizuje kolekci

**Červené vlajky:**
- Neví, kam v Postmanu dát Bearer token (Authorization tab)
- V SoapUI neví, jak nastavit WS-Security
- Hardcoduje ID místo použití výsledku z předchozího requestu
- „Server vrátil 200, je to OK" — bez kontroly těla
- Nezná rozdíl mezi 401 a 403
- Neumí vysvětlit, co je WSDL

## Doporučený průběh

1. **Úvod (5 min)** — představení, předání zadání a přístupových údajů
2. **Praktická část (70 min)** — uchazeč pracuje (REST, SOAP, SQL), zkoušející pozoruje
3. **Diskuze (15 min)** — shrnutí, otázky na zabezpečení a další testy
4. **Závěr (5 min)** — prostor pro otázky uchazeče
