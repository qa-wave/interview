# Prakticky test: integracni tester

## Cil

Pred sebou mas mock knihovniho systemu. Cast je dostupna pres REST, cast pres
SOAP. Tvym ukolem je projit kratky flow od nalezeni knihy az po overeni stavu
vypujcky pres druhy protokol.

Nejde o rychlost. Dulezite je, abys umel/a cist specifikaci, nastavit
zabezpeceni, predavat ID mezi kroky, overovat telo odpovedi a srozumitelne
vysvetlit, co jsi otestoval/a.

Casovy limit prakticke casti je 60 minut.

## Prostredi

Server bezi na:

```text
http://localhost:4010
```

Odkazy najdes v souboru `sluzby.html`.

| Cast | Protokol | Specifikace | Zabezpeceni |
|---|---|---|---|
| Books | REST | `/openapi-books.yaml` | Bearer token |
| Loans | REST | `/openapi-loans.yaml` | Bearer token |
| Loans | SOAP | `/soap?wsdl` | WS-Security UsernameToken |

### REST

```text
Authorization: Bearer BOOKS-REST-TOKEN-2026
```

### SOAP

| Parametr | Hodnota |
|---|---|
| Username | `books-user` |
| Password | `Books!2026` |

## Uloha 1: orientace a zabezpeceni - 5 minut

1. Otevri Swagger a WSDL.
2. Zavolej REST endpoint bez Bearer tokenu a over, ze dostanes `401`.
3. Zavolej stejny endpoint se spravnym tokenem.
4. U SOAP si najdi, kde se nastavuje WS-Security UsernameToken.

**Cil:** Overit, ze rozumis zabezpeceni REST a SOAP rozhrani.

## Uloha 2: najdi knihu pres REST - 10 minut

1. Prostuduj Books OpenAPI.
2. Vyhledej knihu podle ISBN:

```text
978-80-000-0002-8
```

3. Z odpovedi si uloz `bookId`.

**Cil:** Prace se specifikaci, query parametry a ulozenim hodnoty z odpovedi.

## Uloha 3: vytvor a posun vypujcku pres REST - 15 minut

1. Vytvor vypujcku pres `POST /rest/loans`.
2. Pouzij `bookId` z predchozi ulohy.
3. Jmeno vypujcujiciho nastav na:

```text
QA Candidate
```

4. Z odpovedi si uloz `loanId`.
5. Zmen status vypujcky na `BORROWED` pres `PATCH /rest/loans/{id}/status`.
6. Vyzkousej jeden negativni scenar:
   - vypujcka neexistujici knihy, nebo
   - neplatny status, nebo
   - pokus o vypujcku knihy, ktera uz neni dostupna.

**Cil:** Overit navazny REST flow, dynamicka ID a negativni test.

## Uloha 4: over stav pres SOAP - 15 minut

1. Prostuduj WSDL.
2. Nastav WS-Security UsernameToken.
3. Zavolej SOAP operaci `GetLoan` s `loanId` vytvorenym pres REST.
4. Over, ze status v SOAP odpovedi je `BORROWED`.
5. Ohodnot stejnou vypujcku pres REST nebo SOAP ratingem `5`.
6. Druhym protokolem over, ze:
   - `status = RETURNED`
   - `recommendation = RECOMMENDED`

**Cil:** Ukazat, ze REST a SOAP jsou dve rozhrani nad sdilenym stavem.

## Uloha 5: SQL - 10 minut

SQLite databaze je samostatny dataset pro SQL cast. Neni napojena na bezici
REST/SOAP mock.

Spust:

```bash
sqlite3 sql/books.db
```

Napis dotazy:

1. Vypis dostupne knihy v kategorii `Integration`.
2. Spocitej pocet vypujcek podle statusu. Vystup pojmenuj `status`, `pocet`.

**Cil:** Overit zakladni SQL: `SELECT`, `WHERE`, `GROUP BY`, `COUNT`.

## Zaverecna diskuze - 5 minut

Strucne popis:

1. Co jsi overil/a v REST casti.
2. Co jsi overil/a v SOAP casti.
3. Jak se lisi Bearer token a WS-Security UsernameToken.
4. Co bys z tohoto flow automatizoval/a.
