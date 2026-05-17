#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

rm -f books.db
sqlite3 books.db < schema.sql
sqlite3 books.db < seed.sql

echo
echo "Tables and row counts in books.db:"
sqlite3 books.db <<'SQL'
.headers on
.mode column
SELECT 'libraries' AS tbl, COUNT(*) AS rows FROM libraries
UNION ALL SELECT 'books', COUNT(*) FROM books
UNION ALL SELECT 'loans', COUNT(*) FROM loans
UNION ALL SELECT 'loan_events', COUNT(*) FROM loan_events;
SQL
