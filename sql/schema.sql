-- Interview database schema.
-- Cíleně normalizované, ať jsou JOINy a constraints praktické na SQL otázkách.
-- Cizí klíče zapnuté pragmou níže; v SQLite musíte při každém připojení
-- spustit `PRAGMA foreign_keys = ON;`.

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS interview_status_history;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS candidate_skills;
DROP TABLE IF EXISTS interviews;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS recruiters;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS companies;

-- Společnosti (kontext pro pozice).
CREATE TABLE companies (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    country     TEXT NOT NULL
);

-- Pozice (na které se vede pohovor).
CREATE TABLE positions (
    id          INTEGER PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    seniority   TEXT NOT NULL CHECK (seniority IN ('junior', 'mid', 'senior', 'lead')),
    UNIQUE (company_id, title, seniority)
);

-- Personalisté.
CREATE TABLE recruiters (
    id          INTEGER PRIMARY KEY,
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE
);

-- Kandidáti (rozšířená verze proti REST mocku — víc kandidátů, demografie).
CREATE TABLE candidates (
    id          TEXT PRIMARY KEY,           -- CAND-001, …
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    phone       TEXT,
    seniority   TEXT NOT NULL CHECK (seniority IN ('junior', 'mid', 'senior', 'lead')),
    created_at  TEXT NOT NULL               -- ISO 8601
);

-- Skill číselník + spojovací tabulka (many-to-many).
CREATE TABLE skills (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE
);

CREATE TABLE candidate_skills (
    candidate_id TEXT    NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    skill_id     INTEGER NOT NULL REFERENCES skills(id)     ON DELETE CASCADE,
    level        TEXT    NOT NULL CHECK (level IN ('basic', 'intermediate', 'expert')),
    PRIMARY KEY (candidate_id, skill_id)
);

-- Pohovory.
CREATE TABLE interviews (
    id              TEXT PRIMARY KEY,           -- INT-001, …
    candidate_id    TEXT NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    position_id     INTEGER NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
    recruiter_id    INTEGER REFERENCES recruiters(id) ON DELETE SET NULL,
    scheduled_at    TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN
                        ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED')),
    score           INTEGER CHECK (score IS NULL OR (score BETWEEN 0 AND 100)),
    recommendation  TEXT CHECK (recommendation IN ('HIRE', 'NO_HIRE', 'MAYBE') OR recommendation IS NULL)
);

-- Audit přechodů stavů (pro time-series SQL — GROUP BY date, window functions atd.).
CREATE TABLE interview_status_history (
    id              INTEGER PRIMARY KEY,
    interview_id    TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    old_status      TEXT,
    new_status      TEXT NOT NULL,
    changed_at      TEXT NOT NULL,
    changed_by      INTEGER REFERENCES recruiters(id) ON DELETE SET NULL
);

-- Hodnocení (1 pohovor může mít víc bodovacích kol — technické, soft-skills…).
CREATE TABLE evaluations (
    id              INTEGER PRIMARY KEY,
    interview_id    TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    evaluator_id    INTEGER NOT NULL REFERENCES recruiters(id) ON DELETE RESTRICT,
    category        TEXT NOT NULL CHECK (category IN ('technical', 'soft_skills', 'culture_fit')),
    score           INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    comment         TEXT
);

-- Pomocné indexy.
CREATE INDEX idx_interviews_candidate  ON interviews(candidate_id);
CREATE INDEX idx_interviews_status     ON interviews(status);
CREATE INDEX idx_interviews_scheduled  ON interviews(scheduled_at);
CREATE INDEX idx_evaluations_interview ON evaluations(interview_id);
CREATE INDEX idx_history_interview     ON interview_status_history(interview_id);
