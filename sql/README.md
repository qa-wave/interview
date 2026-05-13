# SQL — Interview Database

Doplňková SQLite databáze pro teoretické SQL otázky v zadání. Není připojená
k běžícímu mocku — slouží uchazeči k tomu, aby si některé pojmy mohl ověřit
v praxi, nebo pohovorářovi pro demo dotazy.

## Soubory

| Soubor          | Co je v něm |
|-----------------|-------------|
| `schema.sql`    | DDL (9 tabulek + indexy + check constraints + FK). |
| `seed.py`       | Generátor deterministických fake dat — `python3 seed.py > seed.sql`. |
| `seed.sql`      | Vygenerovaný (regeneruj při změně schématu). |
| `interview.db`  | Hotová SQLite databáze. |
| `examples.sql`  | Ukázkové dotazy mapované na otázky 22–29 ze zadání. |
| `build.sh`      | Postaví databázi od nuly: `./build.sh`. |

## Rychlý start

```bash
./build.sh                                    # postav DB
sqlite3 -header -column interview.db          # interaktivně
sqlite3 -header -column interview.db < examples.sql   # všechny demo dotazy
```

## Schéma (zjednodušeně)

```
companies ─< positions ─< interviews >─ candidates ─< candidate_skills >─ skills
                              │
                              ├─< interview_status_history
                              └─< evaluations >─ recruiters
```

Důležité vlastnosti pro otázky 22–29:

- **JOINy**: kandidáti × pohovory × recruiteři × pozice × firmy
- **GROUP BY**: status, score, recruiter, pozice
- **WHERE vs HAVING**: filtry před vs. po agregaci (kandidáti s ≥ 2 pohovory)
- **UNION**: spojení kandidátů a recruiterů (lidé v procesu)
- **Klíče / constraints**: PK (CAND-XXX, INT-XXX), FK s `ON DELETE` pravidly,
  CHECK constraints na enum sloupcích (status, seniority, recommendation, level)
- **Transakce**: ROLLBACK demo nad `interviews` v `examples.sql`
- **DELETE**: ukázka transakčního `DELETE` + rollback
- **SQL injection**: jen ukázkový komentář — DB samotná je read-only context

## Velikost dat

```
candidates                40
skills                    35
candidate_skills          185
companies                 4
positions                 14
recruiters                6
interviews                50
interview_status_history  113
evaluations               72
```

Data jsou generována s `random.seed(2026)`, takže každý rebuild dá stejné
hodnoty — vhodné pro reprodukovatelná zadání.
