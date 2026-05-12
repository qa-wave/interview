# Přijímací pohovor: Integrační tester

## Informace pro uchazeče

Vítejte u praktické části pohovoru na pozici **integračního testera**. Vaším úkolem je otestovat mock službu **Interview Mock**, která spravuje pohovory a kandidáty. Služba nabízí **REST API** i **SOAP webovou službu**.

- **Časový limit:** 60 minut (praktická část) + 15 minut (teoretické otázky)
- **Nástroj:** Můžete si vybrat **SoapUI** nebo **Postman** (případně oba)
- **Povinné:** Musíte otestovat **REST i SOAP** rozhraní bez ohledu na zvolený nástroj

---

## Spuštění služby

Služba běží na adrese, kterou vám sdělí zkoušející (výchozí: `http://localhost:4010`).

Užitečné odkazy:
- **REST dokumentace (OpenAPI):** `GET /openapi.yaml`
- **SOAP WSDL:** `GET /soap?wsdl`
- **Healthcheck:** `GET /health`

---

## Část 1: Praktické úlohy (60 minut)

### Úloha A: REST API (30 minut)

Proveďte následující kroky a ověřte správnost odpovědí (status kódy, struktura dat, hodnoty):

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

### Úloha B: SOAP API (20 minut)

1. **Získejte WSDL** — stáhněte WSDL definici z `/soap?wsdl` a prostudujte dostupné operace.

2. **Výpis pohovorů** — zavolejte operaci `ListInterviews` a ověřte, že odpověď obsahuje XML se seznamem pohovorů.

3. **Detail pohovoru** — zavolejte operaci `GetInterview` pro `INT-002`. Ověřte, že odpověď obsahuje skóre `82` a doporučení `HIRE`.

4. **Vytvoření pohovoru přes SOAP** — vytvořte nový pohovor pomocí operace `CreateInterview`:
   - Kandidát: `CAND-001`
   - Pozice: `SOAP Tester`
   - Datum: `2026-06-15T14:00:00.000Z`

5. **Změna statusu přes SOAP** — změňte status nově vytvořeného pohovoru na `CANCELLED` pomocí operace `UpdateInterviewStatus`.

### Úloha C: Porovnání a reporting (10 minut)

1. **Porovnejte výsledky** — ověřte, že pohovor vytvořený přes SOAP je viditelný přes REST API (a naopak). Zavolejte `GET /rest/interviews` a najděte oba nově vytvořené pohovory.

2. **Shrnutí** — připravte krátké shrnutí nalezených poznatků:
   - Kolik testů jste provedli?
   - Našli jste nějaké neočekávané chování nebo potenciální bugy?
   - Jaké další testy byste navrhli?

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

### Obecné

13. Co je to integrační testování a čím se liší od unit testování a E2E testování?
14. Jak byste navrhli testovací strategii pro API, které komunikuje s externí třetí stranou?
15. Co je to contract testing (např. Pact) a kdy je vhodné ho použít?
16. Jak byste testovali API s ohledem na výkon (zátěžové testy, response time)?
17. Jaký je rozdíl mezi pozitivním a negativním testováním? Uveďte příklady pro API.
18. Co jsou to mocky a stuby a kdy je vhodné je použít při integračním testování?

---

## Hodnocení

### Praktická část (max. 60 bodů)

| Kritérium | Body |
|---|---|
| REST: Úspěšné provedení kroků 1-7 | 20 |
| REST: Negativní testování (min. 2 scénáře) | 10 |
| SOAP: Úspěšné provedení kroků 1-5 | 15 |
| Cross-protocol ověření (REST ↔ SOAP) | 5 |
| Kvalita práce (struktura requestů, assertions, organizace) | 10 |

### Teoretická část (max. 30 bodů)

| Kritérium | Body |
|---|---|
| REST otázky (5 bodů za otázku) | max. 10 |
| SOAP otázky (5 bodů za otázku) | max. 10 |
| Obecné otázky (5 bodů za otázku) | max. 10 |

### Celkové hodnocení

| Výsledek | Body |
|---|---|
| **Vynikající** | 75-90 |
| **Dobrý** | 55-74 |
| **Dostatečný** | 40-54 |
| **Nedostatečný** | < 40 |

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

> **Poznámka:** SOAP requesty posílejte metodou `POST` na endpoint `/soap` s `Content-Type: text/xml`.
