# Přijímací pohovor: Integrační tester

## Informace pro uchazeče

Vítejte u praktické části pohovoru na pozici **integračního testera**. Vaším úkolem je otestovat mock službu **Interview Mock**, která spravuje pohovory a kandidáty. Služba nabízí **REST API** i **SOAP webovou službu**.

- **Časový limit:** 75 minut (praktická část) + 15 minut (teoretické otázky)
- **Nástroj:** Můžete si vybrat **SoapUI** nebo **Postman** (případně oba)
- **Povinné:** Musíte otestovat **REST i SOAP** rozhraní bez ohledu na zvolený nástroj

---

## Spuštění služby

Služba běží na adrese, kterou vám sdělí zkoušející (výchozí: `http://localhost:4010`).

Užitečné odkazy:
- **REST dokumentace (OpenAPI):** `GET /openapi.yaml`
- **SOAP WSDL:** `GET /soap?wsdl`
- **Healthcheck:** `GET /health`

### Autentizace

Služba vyžaduje **API klíč** v hlavičce `X-API-Key` pro většinu operací.

| Klíč | Role | Oprávnění |
|---|---|---|
| `interview-key-2026` | admin | Čtení i zápis |
| `readonly-key-2026` | reader | Pouze čtení (GET) |

Endpointy **bez nutnosti autentizace:** `/`, `/health`, `/openapi.yaml`, `/rest`, `GET /soap?wsdl`

---

## Část 1: Praktické úlohy (75 minut)

### Úloha A: Zabezpečení API (15 minut)

Ověřte, že služba správně implementuje autentizaci a autorizaci:

1. **Volání bez API klíče** — zavolejte `GET /rest/interviews` bez hlavičky `X-API-Key`. Ověřte, že odpověď je `401 Unauthorized` s chybou `UNAUTHORIZED`.

2. **Neplatný API klíč** — zavolejte stejný endpoint s neplatným klíčem (např. `X-API-Key: invalid`). Ověřte, že odpověď je opět `401`.

3. **Platný admin klíč** — zavolejte `GET /rest/interviews` s klíčem `interview-key-2026`. Ověřte, že odpověď je `200` a obsahuje seznam pohovorů.

4. **Read-only klíč na čtení** — zavolejte `GET /rest/interviews` s klíčem `readonly-key-2026`. Ověřte, že čtení funguje i s tímto klíčem.

5. **Read-only klíč na zápis** — zkuste vytvořit pohovor (`POST /rest/interviews`) s read-only klíčem. Ověřte, že odpověď je `403 Forbidden` s chybou `FORBIDDEN`.

6. **Veřejné endpointy** — ověřte, že `/health` a `GET /soap?wsdl` fungují **bez** API klíče.

7. **SOAP autentizace** — ověřte, že SOAP operace (POST `/soap`) také vyžaduje API klíč. Zavolejte operaci `ListInterviews` bez klíče a ověřte `401`.

### Úloha B: REST API (20 minut)

> **Poznámka:** Pro všechny následující requesty použijte admin klíč `X-API-Key: interview-key-2026`.

1. **Ověřte dostupnost služby** — zavolejte healthcheck endpoint a ověřte, že služba běží.

2. **Získejte seznam pohovorů** — zavolejte endpoint pro výpis všech pohovorů. Ověřte, že odpověď obsahuje pole `interviews` a každý záznam má pole `id`, `status`, `candidate`.

3. **Filtrování** — získejte pouze pohovory se statusem `SCHEDULED`. Ověřte, že všechny vrácené záznamy mají správný status.

4. **Detail pohovoru** — získejte detail pohovoru `INT-001`. Ověřte, že odpověď obsahuje informace o kandidátovi (jméno, email, skills).

5. **Vytvoření nového pohovoru** — vytvořte pohovor pro kandidáta `CAND-002` na pozici `Integration Tester` s datem `2026-06-01T10:00:00.000Z`. Ověřte status kód `201` a zapamatujte si `id` nového pohovoru.

6. **Změna statusu** — změňte status nově vytvořeného pohovoru na `IN_PROGRESS`. Ověřte, že se status skutečně změnil.

7. **Hodnocení pohovoru** — ohodnoťte pohovor skóre `68`. Ověřte, že:
   - status se změnil na `COMPLETED`
   - recommendation je `REVIEW` (skóre 55-74)

8. **Negativní testování** — otestujte alespoň **dva** chybové scénáře, například:
   - Získání neexistujícího pohovoru (očekávaný 404)
   - Vytvoření pohovoru pro neexistujícího kandidáta (očekávaný 400)
   - Hodnocení nevalidním skóre, např. `150` (očekávaný 400)
   - Změna statusu na neplatnou hodnotu (očekávaný 400)

### Úloha C: Řetězení parametrů a práce s proměnnými (15 minut)

Cílem této úlohy je ověřit schopnost pracovat s daty z odpovědí předchozích volání. **Každý krok závisí na výsledku předchozího** — musíte dynamicky používat hodnoty z odpovědí.

> **Důležité:** Při řešení této úlohy správně nastavte proměnné ve svém nástroji. Rozlišujte, kam proměnnou uložíte:
> - **Globální proměnné** — sdílené napříč všemi kolekcemi/projekty (např. URL serveru)
> - **Environment proměnné** — specifické pro prostředí, např. test vs. produkce (např. API klíč)
> - **Collection/lokální proměnné** — platné jen v rámci jedné kolekce nebo jednoho requestu (např. ID z odpovědi)
>
> Zkoušející se vás na konci zeptá, **proč jste kterou proměnnou uložili na danou úroveň**.

1. **Nastavte proměnné pro prostředí** — vytvořte environment (např. „Test") a nastavte v něm:
   - `baseUrl` = adresa služby (např. `http://localhost:4010`)
   - `apiKey` = admin API klíč
   - Vysvětlete, proč tyto hodnoty patří do environment a ne do globálních proměnných.

2. **Najděte kandidáta podle emailu** — zavolejte `GET /rest/candidates?email=petr.svoboda@example.test`. Z odpovědi automaticky uložte `id` nalezeného kandidáta do **collection proměnné** (v Postmanu přes Tests skript, v SoapUI přes Property Transfer).

3. **Vytvořte pohovor pro nalezeného kandidáta** — použijte proměnnou `{{candidateId}}` z předchozího kroku (nepoužívejte hardcoded hodnotu) a vytvořte pohovor:
   - Pozice: `Senior Integration Tester`
   - Datum: `2026-07-01T09:00:00.000Z`

4. **Ověřte vytvoření** — z odpovědi na vytvoření automaticky uložte `id` nového pohovoru do proměnné a zavolejte `GET /rest/interviews/{{interviewId}}`. Ověřte, že detail obsahuje správného kandidáta.

5. **Proveďte celý lifecycle** — pomocí proměnné `{{interviewId}}`:
   - Změňte status na `IN_PROGRESS`
   - Ohodnoťte skóre `91`
   - Ověřte, že recommendation je `HIRE`

6. **Ověřte výsledek přes filtr** — zavolejte `GET /rest/interviews?candidateId={{candidateId}}&status=COMPLETED` a ověřte, že nově vytvořený pohovor je v seznamu.

7. **Najděte kandidáta podle skillu** — zavolejte `GET /rest/candidates?skill=SQL`. Ověřte, kolik kandidátů má tento skill.

### Úloha D: SOAP API (15 minut)

> **Poznámka:** SOAP requesty vyžadují hlavičku `X-API-Key` stejně jako REST.

1. **Získejte WSDL** — stáhněte WSDL definici z `/soap?wsdl` a prostudujte dostupné operace.

2. **Výpis pohovorů** — zavolejte operaci `ListInterviews` a ověřte, že odpověď obsahuje XML se seznamem pohovorů.

3. **Detail pohovoru** — zavolejte operaci `GetInterview` pro `INT-002`. Ověřte, že odpověď obsahuje skóre `82` a doporučení `HIRE`.

4. **Vytvoření pohovoru přes SOAP** — vytvořte nový pohovor pomocí operace `CreateInterview`:
   - Kandidát: `CAND-001`
   - Pozice: `SOAP Tester`
   - Datum: `2026-06-15T14:00:00.000Z`

5. **Změna statusu přes SOAP** — změňte status nově vytvořeného pohovoru na `CANCELLED` pomocí operace `UpdateInterviewStatus`.

### Úloha E: Porovnání a reporting (10 minut)

1. **Porovnejte výsledky** — ověřte, že pohovory vytvořené přes SOAP jsou viditelné přes REST API (a naopak). Zavolejte `GET /rest/interviews` a najděte všechny nově vytvořené pohovory.

2. **Shrnutí** — připravte krátké shrnutí nalezených poznatků:
   - Kolik testů jste provedli?
   - Našli jste nějaké neočekávané chování nebo potenciální bugy?
   - Jaké další testy byste navrhli?
   - Jak byste zabezpečení API vylepšili?

---

## Část 2: Teoretické otázky (15 minut)

Zkoušející vybere 5-6 otázek z následujícího seznamu.

### REST API

1. Co znamená zkratka REST a jaké jsou základní principy RESTful API?
2. Jaký je rozdíl mezi HTTP metodami PUT a PATCH?
3. Co je to idempotence a které HTTP metody by měly být idempotentní?
4. Vysvětlete skupiny HTTP status kódů (1xx, 2xx, 3xx, 4xx, 5xx) a uveďte příklady.
5. Co je OpenAPI (Swagger) specifikace a k čemu slouží?
6. Jak byste testovali autentizaci a autorizaci REST API (API klíče, OAuth, JWT)?
7. Co je to Content Negotiation v kontextu HTTP?

### SOAP

8. Co znamená zkratka SOAP a jaké jsou hlavní části SOAP zprávy (Envelope, Header, Body)?
9. Co je WSDL a jaké informace obsahuje?
10. Jaký je rozdíl mezi SOAP styly document/literal a rpc/encoded?
11. Jak se v SOAP komunikují chyby (SOAP Fault)? Jakou strukturu má Fault element?
12. Jaké jsou výhody a nevýhody SOAP oproti REST?

### Zabezpečení a obecné

13. Co je to integrační testování a čím se liší od unit testování a E2E testování?
14. Jaký je rozdíl mezi autentizací a autorizací? Uveďte příklady z praxe.
15. Co je to contract testing (např. Pact) a kdy je vhodné ho použít?
16. Jak byste testovali API s ohledem na výkon (zátěžové testy, response time)?
17. Jaký je rozdíl mezi pozitivním a negativním testováním? Uveďte příklady pro API.
18. Co jsou to mocky a stuby a kdy je vhodné je použít při integračním testování?
19. Jaké znáte způsoby zabezpečení API? Porovnejte API klíče, OAuth 2.0 a JWT.
20. Co je to CORS a proč je důležitý pro webové API?
21. Jaký je rozdíl mezi globálními, environment a collection proměnnými v Postmanu (nebo odpovídajícími úrovněmi v SoapUI)? Kdy použijete kterou úroveň?

---

## Hodnocení

### Praktická část (max. 70 bodů)

| Kritérium | Body |
|---|---|
| Zabezpečení: Ověření autentizace a autorizace (úloha A) | 10 |
| REST: Úspěšné provedení kroků 1-7 (úloha B) | 15 |
| REST: Negativní testování, min. 2 scénáře (úloha B) | 5 |
| Řetězení parametrů: Dynamické použití dat z odpovědí (úloha C) | 15 |
| SOAP: Úspěšné provedení kroků 1-5 (úloha D) | 15 |
| Cross-protocol ověření (úloha E) | 5 |
| Kvalita práce (struktura requestů, assertions, organizace) | 5 |

### Teoretická část (max. 30 bodů)

| Kritérium | Body |
|---|---|
| REST otázky (5 bodů za otázku) | max. 10 |
| SOAP otázky (5 bodů za otázku) | max. 10 |
| Zabezpečení a obecné otázky (5 bodů za otázku) | max. 10 |

### Celkové hodnocení

| Výsledek | Body |
|---|---|
| **Vynikající** | 80-100 |
| **Dobrý** | 60-79 |
| **Dostatečný** | 45-59 |
| **Nedostatečný** | < 45 |

---

## Nápovědy pro SOAP requesty

### Struktura SOAP Envelope

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="urn:interview-mock">
  <soap:Body>
    <tns:OPERATION_NAME>
      <!-- parametry -->
    </tns:OPERATION_NAME>
  </soap:Body>
</soap:Envelope>
```

### Příklad: GetInterview

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="urn:interview-mock">
  <soap:Body>
    <tns:GetInterviewRequest>
      <tns:id>INT-001</tns:id>
    </tns:GetInterviewRequest>
  </soap:Body>
</soap:Envelope>
```

> **Poznámka:** SOAP requesty posílejte metodou `POST` na endpoint `/soap` s `Content-Type: text/xml` a hlavičkou `X-API-Key`.
