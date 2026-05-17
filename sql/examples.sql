PRAGMA foreign_keys = ON;

.print
.print --- Dostupne knihy v kategorii Integration
SELECT id, title, author
FROM books
WHERE category = 'Integration' AND available = 1
ORDER BY title;

.print
.print --- Pocty vypujcek podle statusu
SELECT status, COUNT(*) AS pocet
FROM loans
GROUP BY status
ORDER BY pocet DESC, status;

.print
.print --- JOIN knihy a vypujcky
SELECT l.id AS loan_id, b.title, l.borrower_name, l.status
FROM loans l
JOIN books b ON b.id = l.book_id
ORDER BY l.id;

.print
.print --- HAVING: kategorie s vice nez jednou knihou
SELECT category, COUNT(*) AS pocet
FROM books
GROUP BY category
HAVING pocet > 1;
