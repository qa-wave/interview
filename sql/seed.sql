PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

INSERT INTO libraries (id, name, city) VALUES
  (1, 'Mestska knihovna Centrum', 'Praha'),
  (2, 'Technicka knihovna', 'Brno');

INSERT INTO books (id, library_id, isbn, title, author, category, available) VALUES
  ('BOOK-001', 1, '978-80-000-0001-1', 'Zaklady integracniho testovani', 'Jana Novakova', 'Testing', 1),
  ('BOOK-002', 1, '978-80-000-0002-8', 'SOAP a REST v praxi', 'Petr Svoboda', 'Integration', 1),
  ('BOOK-003', 2, '978-80-000-0003-5', 'SQL pro testery', 'Eva Dvorakova', 'Database', 0),
  ('BOOK-004', 2, '978-80-000-0004-2', 'Automatizace API testu', 'Martin Kral', 'Testing', 1),
  ('BOOK-005', 1, '978-80-000-0005-9', 'Integracni architektury', 'Lucie Cerna', 'Integration', 0);

INSERT INTO loans (id, book_id, borrower_name, borrowed_at, due_date, status, rating, recommendation) VALUES
  ('LOAN-001', 'BOOK-003', 'Test Reader', '2026-05-10', '2026-05-31', 'BORROWED', NULL, NULL),
  ('LOAN-002', 'BOOK-005', 'API Reader', '2026-05-01', '2026-05-15', 'OVERDUE', NULL, NULL),
  ('LOAN-003', 'BOOK-001', 'QA Candidate', '2026-04-20', '2026-05-05', 'RETURNED', 5, 'RECOMMENDED'),
  ('LOAN-004', 'BOOK-004', 'Demo User', '2026-04-22', '2026-05-06', 'RETURNED', 3, 'NEUTRAL');

INSERT INTO loan_events (loan_id, old_status, new_status, changed_at) VALUES
  ('LOAN-001', NULL, 'REQUESTED', '2026-05-10T09:00:00Z'),
  ('LOAN-001', 'REQUESTED', 'BORROWED', '2026-05-10T09:05:00Z'),
  ('LOAN-002', NULL, 'REQUESTED', '2026-05-01T10:00:00Z'),
  ('LOAN-002', 'REQUESTED', 'BORROWED', '2026-05-01T10:04:00Z'),
  ('LOAN-002', 'BORROWED', 'OVERDUE', '2026-05-16T00:00:00Z'),
  ('LOAN-003', NULL, 'REQUESTED', '2026-04-20T08:00:00Z'),
  ('LOAN-003', 'REQUESTED', 'BORROWED', '2026-04-20T08:10:00Z'),
  ('LOAN-003', 'BORROWED', 'RETURNED', '2026-05-04T16:30:00Z');

COMMIT;
