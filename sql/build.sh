#!/usr/bin/env bash
# Rebuild interview.db from scratch.
set -euo pipefail
cd "$(dirname "$0")"

rm -f interview.db
python3 seed.py > seed.sql
sqlite3 interview.db < schema.sql
sqlite3 interview.db < seed.sql

echo
echo "Tables and row counts in interview.db:"
sqlite3 interview.db <<'SQL'
.headers on
.mode column
SELECT 'candidates'                 AS tbl, COUNT(*) AS rows FROM candidates
UNION ALL SELECT 'skills',                    COUNT(*) FROM skills
UNION ALL SELECT 'candidate_skills',          COUNT(*) FROM candidate_skills
UNION ALL SELECT 'companies',                 COUNT(*) FROM companies
UNION ALL SELECT 'positions',                 COUNT(*) FROM positions
UNION ALL SELECT 'recruiters',                COUNT(*) FROM recruiters
UNION ALL SELECT 'interviews',                COUNT(*) FROM interviews
UNION ALL SELECT 'interview_status_history',  COUNT(*) FROM interview_status_history
UNION ALL SELECT 'evaluations',               COUNT(*) FROM evaluations;
SQL
