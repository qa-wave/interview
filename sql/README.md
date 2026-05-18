# SQL část

SQLite databáze je samostatný dataset pro SQL část testu. Není napojená na
běžící REST/SOAP mock.

## Soubory

| Soubor | Popis |
|---|---|
| `schema.sql` | Schéma knihoven, knih, výpůjček a událostí. |
| `seed.sql` | Deterministická testovací data. |
| `books.db` | Hotová SQLite databáze. |
| `examples.sql` | Ukázkové SQL dotazy. |
| `build.sh` | Znovu postaví databázi. |

## Rychlý start

```bash
./build.sh
sqlite3 -header -column books.db
sqlite3 -header -column books.db < examples.sql
```

## Kandidátské úlohy

1. Vypiš dostupné knihy v kategorii `Integration` (sloupce `id`, `title`, `author`).
2. Spočítej počet výpůjček podle statusu. Výstup pojmenuj `status`, `pocet`,
   seřaď sestupně podle `pocet`.
3. Změna dat: jedním `UPDATE` označ všechny knihy v kategorii `Testing` jako
   nedostupné (`available = 0`). Pak `SELECT`em ověř, že v kategorii `Testing`
   už není žádná dostupná kniha, a urči, kolik řádků `UPDATE` změnil.
