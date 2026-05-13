-- Ukázkové dotazy mapované na teoretické SQL otázky 22-29 ze zadání.
-- Spouštěj v sqlite3 nad interview.db, např.:
--   sqlite3 -header -column interview.db < examples.sql

PRAGMA foreign_keys = ON;

-- =============================================================
-- Otázka 22: JOINy
-- =============================================================

.print
.print --- 22a) INNER JOIN: kandidát → jeho pohovory (jen kdo nějaký má)
.print
SELECT c.id, c.first_name || ' ' || c.last_name AS name, COUNT(i.id) AS interviews
FROM candidates c
INNER JOIN interviews i ON i.candidate_id = c.id
GROUP BY c.id
ORDER BY interviews DESC
LIMIT 5;

.print
.print --- 22b) LEFT JOIN: VŠICHNI kandidáti, i bez pohovoru (NULL → 0)
.print
SELECT c.id, c.first_name || ' ' || c.last_name AS name, COUNT(i.id) AS interviews
FROM candidates c
LEFT JOIN interviews i ON i.candidate_id = c.id
GROUP BY c.id
ORDER BY interviews ASC
LIMIT 5;

.print
.print --- 22c) Kandidáti BEZ pohovoru (anti-join přes LEFT JOIN + IS NULL)
.print
SELECT c.id, c.first_name || ' ' || c.last_name AS name
FROM candidates c
LEFT JOIN interviews i ON i.candidate_id = c.id
WHERE i.id IS NULL;

-- =============================================================
-- Otázka 23: GROUP BY + agregační funkce
-- =============================================================

.print
.print --- 23) Počet pohovorů a průměrné skóre podle statusu
.print
SELECT status,
       COUNT(*)              AS total,
       AVG(score)            AS avg_score,
       MIN(score)            AS min_score,
       MAX(score)            AS max_score
FROM interviews
GROUP BY status
ORDER BY total DESC;

-- =============================================================
-- Otázka 24: WHERE vs HAVING
-- =============================================================

.print
.print --- 24a) WHERE filtruje řádky PŘED agregací (jen COMPLETED pohovory)
.print
SELECT candidate_id, COUNT(*) AS completed_interviews
FROM interviews
WHERE status = 'COMPLETED'
GROUP BY candidate_id
ORDER BY completed_interviews DESC
LIMIT 5;

.print
.print --- 24b) HAVING filtruje skupiny PO agregaci (kandidáti s 2+ pohovory)
.print
SELECT candidate_id, COUNT(*) AS n
FROM interviews
GROUP BY candidate_id
HAVING n >= 2
ORDER BY n DESC;

-- =============================================================
-- Otázka 25: UNION vs UNION ALL
-- =============================================================

.print
.print --- 25a) UNION ALL: všichni účastníci pohovorů (kandidáti i recruiteři, s duplicitami)
.print
SELECT * FROM (SELECT 'candidate' AS role, first_name || ' ' || last_name AS name FROM candidates LIMIT 3)
UNION ALL
SELECT * FROM (SELECT 'recruiter', first_name || ' ' || last_name FROM recruiters LIMIT 3);

.print
.print --- 25b) UNION (distinct): unikátní jména v obou rolích
.print
SELECT first_name FROM candidates
UNION
SELECT first_name FROM recruiters
ORDER BY 1
LIMIT 10;

-- =============================================================
-- Otázka 26: Primary key / foreign key / unique constraint
-- =============================================================

.print
.print --- 26a) Pokus o duplicitní PRIMARY KEY skončí s constraint error.
.print ---     Tento příkaz schválně failne — odkomentuj, ať uvidíš chybu:
.print ---     INSERT INTO candidates (id, first_name, last_name, email, seniority, created_at)
.print ---       VALUES ('CAND-001', 'X', 'Y', 'x.y@example.test', 'mid', '2026-01-01T00:00:00.000Z');
.print
.print --- 26b) Foreign key — nelze vytvořit pohovor pro neexistujícího kandidáta:
.print ---     INSERT INTO interviews (id, candidate_id, position_id, scheduled_at, status)
.print ---       VALUES ('INT-999', 'CAND-NONE', 1, '2026-01-01T00:00:00.000Z', 'SCHEDULED');
.print ---     → FOREIGN KEY constraint failed
.print

-- =============================================================
-- Otázka 27: DELETE vs TRUNCATE vs DROP
-- =============================================================

.print
.print --- 27) Transakční DELETE — vrátíme zpět ROLLBACK. Po skončení musí být počet stejný.
.print
.print BEFORE:
SELECT COUNT(*) AS interviews FROM interviews;
BEGIN;
  DELETE FROM interviews WHERE status = 'CANCELLED';
.print AFTER DELETE (uvnitř transakce):
SELECT COUNT(*) AS interviews FROM interviews;
ROLLBACK;
.print AFTER ROLLBACK:
SELECT COUNT(*) AS interviews FROM interviews;
-- TRUNCATE v SQLite neexistuje, ekvivalent je `DELETE FROM t` (SQLite to optimalizuje).
-- DROP TABLE odstraní tabulku včetně struktury — nevratné bez backupu.

-- =============================================================
-- Otázka 28: SQL injection (demo, NESPOUŠTĚT na produkci)
-- =============================================================

.print
.print --- 28) Demonstrace: konkatenace VS parametrizace.
.print
.print --- ŠPATNĚ — String concatenation umožní injekci:
.print ---   SELECT * FROM candidates WHERE id = ''' || user_input || ''';
.print ---   Pro user_input = "' OR '1'='1" vrátí všechny řádky.
.print
.print --- SPRÁVNĚ — prepared statement / parametrizovaný dotaz:
.print ---   SELECT * FROM candidates WHERE id = ?;
.print ---   Driver pošle hodnotu odděleně, nemůže být interpretována jako SQL.
.print
.print Ukázka: skutečný (parametrizovaný) lookup vrátí jen 1 řádek:
SELECT id, first_name, last_name FROM candidates WHERE id = 'CAND-001';

-- =============================================================
-- Otázka 29: Transakce + ACID
-- =============================================================

.print
.print --- 29) Multi-step transakce: vytvořit pohovor + zalogovat přechod stavu.
.print     Když jedna část selže, ROLLBACK vrátí obě změny.
.print
BEGIN;
  INSERT INTO interviews (id, candidate_id, position_id, recruiter_id, scheduled_at, status)
    VALUES ('INT-TEST', 'CAND-001', 1, 1, '2026-12-01T10:00:00.000Z', 'SCHEDULED');
  INSERT INTO interview_status_history (interview_id, old_status, new_status, changed_at, changed_by)
    VALUES ('INT-TEST', NULL, 'SCHEDULED', '2026-12-01T10:00:00.000Z', 1);
.print Uvnitř transakce — pohovor existuje:
SELECT id, status FROM interviews WHERE id = 'INT-TEST';
ROLLBACK;
.print Po ROLLBACK — pohovor zmizel (atomicita):
SELECT id, status FROM interviews WHERE id = 'INT-TEST';
