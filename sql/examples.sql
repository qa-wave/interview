PRAGMA foreign_keys = ON;

.print
.print --- Dostupné knihy v kategorii Integration
SELECT id, title, author
FROM books
WHERE category = 'Integration' AND available = 1
ORDER BY title;

.print
.print --- Počty výpůjček podle statusu
SELECT status, COUNT(*) AS pocet
FROM loans
GROUP BY status
ORDER BY pocet DESC, status;

.print
.print --- JOIN knihy a výpůjčky
SELECT l.id AS loan_id, b.title, l.borrower_name, l.status
FROM loans l
JOIN books b ON b.id = l.book_id
ORDER BY l.id;

.print
.print --- HAVING: kategorie s více než jednou knihou
SELECT category, COUNT(*) AS pocet
FROM books
GROUP BY category
HAVING pocet > 1;

.print
.print --- Změna dat: označ knihy v kategorii Testing jako nedostupné
.print --- (v transakci s ROLLBACK, aby examples.sql zůstal nedestruktivní)
BEGIN;
SELECT COUNT(*) AS testing_pred FROM books WHERE category = 'Testing' AND available = 1;
UPDATE books SET available = 0 WHERE category = 'Testing';
SELECT changes() AS zmeneno_radku;
SELECT COUNT(*) AS testing_po FROM books WHERE category = 'Testing' AND available = 1;
ROLLBACK;
