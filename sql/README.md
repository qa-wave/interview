# SQL cast

SQLite databaze je samostatny dataset pro SQL cast testu. Neni napojena na
bezici REST/SOAP mock.

## Soubory

| Soubor | Popis |
|---|---|
| `schema.sql` | Schéma knihoven, knih, vypujcek a udalosti. |
| `seed.sql` | Deterministicka testovaci data. |
| `books.db` | Hotova SQLite databaze. |
| `examples.sql` | Ukazkove SQL dotazy. |
| `build.sh` | Znovu postavi databazi. |

## Rychly start

```bash
./build.sh
sqlite3 -header -column books.db
sqlite3 -header -column books.db < examples.sql
```

## Kandidatske ulohy

1. Vypis dostupne knihy v kategorii `Integration`.
2. Spocitej pocet vypujcek podle statusu. Vystup pojmenuj `status`, `pocet`.
