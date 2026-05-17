PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS loan_events;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS libraries;

CREATE TABLE libraries (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL
);

CREATE TABLE books (
  id TEXT PRIMARY KEY,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  isbn TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  available INTEGER NOT NULL CHECK (available IN (0, 1))
);

CREATE TABLE loans (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  borrower_name TEXT NOT NULL,
  borrowed_at TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'BORROWED', 'RETURNED', 'OVERDUE', 'CANCELLED', 'LOST')),
  rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  recommendation TEXT CHECK (recommendation IN ('RECOMMENDED', 'NEUTRAL', 'NOT_RECOMMENDED') OR recommendation IS NULL)
);

CREATE TABLE loan_events (
  id INTEGER PRIMARY KEY,
  loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_available ON books(available);
CREATE INDEX idx_loans_book ON loans(book_id);
CREATE INDEX idx_loans_status ON loans(status);
