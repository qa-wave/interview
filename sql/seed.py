"""Generate deterministic fake data for the interview SQLite database.

Run:
    sqlite3 interview.db < schema.sql
    python3 seed.py > seed.sql
    sqlite3 interview.db < seed.sql

…or use build.sh which does all three in one shot.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta

random.seed(2026)

COMPANIES = [
    ("Modré Vlny s.r.o.",       "CZ"),
    ("Nordic Bytes AB",         "SE"),
    ("AlpaaPay GmbH",           "DE"),
    ("River Code Ltd.",         "GB"),
]

POSITIONS_BY_COMPANY = {
    "Modré Vlny s.r.o.":   [
        ("QA Automation Engineer", "mid"),
        ("QA Automation Engineer", "senior"),
        ("Backend Developer",      "mid"),
        ("Backend Developer",      "senior"),
        ("Site Reliability Engineer", "senior"),
    ],
    "Nordic Bytes AB":     [
        ("Integration Tester",     "mid"),
        ("Integration Tester",     "senior"),
        ("Data Engineer",          "senior"),
    ],
    "AlpaaPay GmbH":       [
        ("Mobile Developer",       "mid"),
        ("Mobile Developer",       "lead"),
        ("Security Engineer",      "senior"),
    ],
    "River Code Ltd.":     [
        ("Performance Tester",     "junior"),
        ("Performance Tester",     "senior"),
        ("Frontend Developer",     "mid"),
    ],
}

RECRUITERS = [
    ("Jana",    "Krátká",      "jana.kratka@example.test"),
    ("Petr",    "Dvořák",      "petr.dvorak@example.test"),
    ("Lucie",   "Procházková", "lucie.prochazkova@example.test"),
    ("Tomáš",   "Veselý",      "tomas.vesely@example.test"),
    ("Erik",    "Berg",        "erik.berg@example.test"),
    ("Marta",   "Fischerová",  "marta.fischerova@example.test"),
]

SKILLS = [
    "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "Kotlin", "Swift",
    "REST", "SOAP", "GraphQL", "gRPC", "WebSocket",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
    "Docker", "Kubernetes", "Terraform", "AWS", "GCP",
    "Postman", "JMeter", "k6", "Playwright", "Selenium", "Cypress",
    "CI/CD", "GitHub Actions", "Jenkins",
    "Security", "OAuth", "JWT",
]

FIRST_NAMES = [
    "Anna", "Petr", "Eva", "Tomáš", "Lucie", "Jakub", "Klára", "Martin",
    "Veronika", "Ondřej", "Tereza", "Adam", "Hana", "David", "Barbora", "Jiří",
    "Kateřina", "Filip", "Markéta", "Pavel", "Erika", "Liam", "Sofia", "Lukas",
    "Nora", "Linus", "Maja", "Karl", "Ida", "Felix",
]
LAST_NAMES = [
    "Nováková", "Svoboda", "Dvořáková", "Černý", "Procházková", "Kučera",
    "Veselá", "Horák", "Marek", "Pospíšilová", "Beneš", "Štěpánková",
    "Polák", "Růžičková", "Macháček", "Andersson", "Lindgren", "Schmidt",
    "Fischer", "Schneider", "Bauer", "Smith", "Johnson", "Williams",
]

STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "FAILED"]
RECOMMENDATIONS = {"COMPLETED": ["HIRE", "NO_HIRE", "MAYBE"]}

# ---------- helpers ---------- #

def q(s: str) -> str:
    """SQL-quote a string literal."""
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def print_section(title: str) -> None:
    print(f"\n-- {title}")


# ---------- emit ---------- #

print("PRAGMA foreign_keys = ON;")
print("BEGIN TRANSACTION;")

# Companies + positions
print_section("companies")
company_ids: dict[str, int] = {}
for i, (name, country) in enumerate(COMPANIES, start=1):
    company_ids[name] = i
    print(f"INSERT INTO companies (id, name, country) VALUES ({i}, {q(name)}, {q(country)});")

print_section("positions")
position_rows: list[tuple[int, int, str, str]] = []
pid = 0
for company, positions in POSITIONS_BY_COMPANY.items():
    for title, seniority in positions:
        pid += 1
        position_rows.append((pid, company_ids[company], title, seniority))
        print(
            f"INSERT INTO positions (id, company_id, title, seniority) VALUES "
            f"({pid}, {company_ids[company]}, {q(title)}, {q(seniority)});"
        )

# Recruiters
print_section("recruiters")
for i, (fn, ln, email) in enumerate(RECRUITERS, start=1):
    print(
        f"INSERT INTO recruiters (id, first_name, last_name, email) VALUES "
        f"({i}, {q(fn)}, {q(ln)}, {q(email)});"
    )

# Skills
print_section("skills")
skill_ids: dict[str, int] = {}
for i, name in enumerate(SKILLS, start=1):
    skill_ids[name] = i
    print(f"INSERT INTO skills (id, name) VALUES ({i}, {q(name)});")

# Candidates
print_section("candidates")
N_CANDIDATES = 40
candidate_ids: list[str] = []
candidate_seniority: dict[str, str] = {}
base_date = datetime(2025, 1, 1)
for i in range(1, N_CANDIDATES + 1):
    cid = f"CAND-{i:03d}"
    candidate_ids.append(cid)
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    email = f"{fn.lower()}.{ln.lower()}{i}@example.test".replace("á", "a").replace("í", "i").replace("é", "e").replace("ě", "e").replace("š", "s").replace("č", "c").replace("ř", "r").replace("ž", "z").replace("ý", "y").replace("ů", "u").replace("ú", "u").replace("ň", "n").replace("ď", "d").replace("ť", "t").replace("ó", "o")
    phone = f"+4207{random.randint(10, 99)}{random.randint(100, 999)}{random.randint(100, 999)}"
    seniority = random.choices(["junior", "mid", "senior", "lead"], weights=[2, 4, 3, 1])[0]
    candidate_seniority[cid] = seniority
    created_at = iso(base_date + timedelta(days=random.randint(0, 400)))
    print(
        f"INSERT INTO candidates (id, first_name, last_name, email, phone, seniority, created_at) "
        f"VALUES ({q(cid)}, {q(fn)}, {q(ln)}, {q(email)}, {q(phone)}, {q(seniority)}, {q(created_at)});"
    )

# Candidate skills (3-6 skills per candidate; SQL appears in many to make the demo query interesting)
print_section("candidate_skills")
sql_skill = skill_ids["SQL"]
for cid in candidate_ids:
    k = random.randint(3, 6)
    picks = random.sample(list(skill_ids.values()), k)
    # Bias toward SQL on ~40 % candidates so the GROUP BY queries find a meaningful bucket.
    if random.random() < 0.4 and sql_skill not in picks:
        picks[0] = sql_skill
    for s in picks:
        level = random.choices(["basic", "intermediate", "expert"], weights=[3, 5, 2])[0]
        print(
            f"INSERT INTO candidate_skills (candidate_id, skill_id, level) VALUES "
            f"({q(cid)}, {s}, {q(level)});"
        )

# Interviews — one or more per candidate
print_section("interviews")
interview_rows: list[tuple] = []
iid_counter = 0
for cid in candidate_ids:
    n_interviews = random.choices([0, 1, 2, 3], weights=[1, 5, 3, 1])[0]
    for _ in range(n_interviews):
        iid_counter += 1
        iid = f"INT-{iid_counter:03d}"
        pos_id, _, _, pos_seniority = random.choice(position_rows)
        recruiter_id = random.choice(range(1, len(RECRUITERS) + 1))
        scheduled = base_date + timedelta(days=random.randint(0, 480), hours=random.randint(8, 17))
        status = random.choices(
            STATUSES,
            weights=[3, 1, 6, 1, 1],   # mostly COMPLETED, some SCHEDULED, few others
        )[0]
        if status == "COMPLETED":
            score = random.randint(40, 98)
            if score >= 80:
                recommendation = "HIRE"
            elif score >= 60:
                recommendation = "MAYBE"
            else:
                recommendation = "NO_HIRE"
        elif status == "FAILED":
            score = random.randint(0, 45)
            recommendation = "NO_HIRE"
        else:
            score = "NULL"
            recommendation = None
        rec_sql = q(recommendation) if recommendation else "NULL"
        score_sql = score if isinstance(score, int) else "NULL"
        print(
            f"INSERT INTO interviews (id, candidate_id, position_id, recruiter_id, scheduled_at, "
            f"status, score, recommendation) VALUES "
            f"({q(iid)}, {q(cid)}, {pos_id}, {recruiter_id}, {q(iso(scheduled))}, "
            f"{q(status)}, {score_sql}, {rec_sql});"
        )
        interview_rows.append((iid, cid, pos_id, recruiter_id, scheduled, status, score, recommendation))

# Status history — synthesize transitions for a sample of interviews
print_section("interview_status_history")
hid = 0
for iid, _cid, _pos, recruiter_id, scheduled, status, *_ in interview_rows:
    transitions: list[tuple[str | None, str, datetime]] = []
    base = scheduled - timedelta(days=random.randint(3, 14))
    transitions.append((None, "SCHEDULED", base))
    if status == "IN_PROGRESS":
        transitions.append(("SCHEDULED", "IN_PROGRESS", scheduled))
    elif status == "COMPLETED":
        transitions.append(("SCHEDULED", "IN_PROGRESS", scheduled))
        transitions.append(("IN_PROGRESS", "COMPLETED", scheduled + timedelta(hours=2)))
    elif status == "CANCELLED":
        transitions.append(("SCHEDULED", "CANCELLED", scheduled - timedelta(days=1)))
    elif status == "FAILED":
        transitions.append(("SCHEDULED", "IN_PROGRESS", scheduled))
        transitions.append(("IN_PROGRESS", "FAILED", scheduled + timedelta(hours=1)))
    for old, new, when in transitions:
        hid += 1
        print(
            f"INSERT INTO interview_status_history (id, interview_id, old_status, new_status, "
            f"changed_at, changed_by) VALUES "
            f"({hid}, {q(iid)}, {q(old) if old else 'NULL'}, {q(new)}, {q(iso(when))}, {recruiter_id});"
        )

# Evaluations — only for COMPLETED interviews
print_section("evaluations")
eid = 0
for iid, _cid, _pos, recruiter_id, _sched, status, score, _rec in interview_rows:
    if status != "COMPLETED" or not isinstance(score, int):
        continue
    for category in ("technical", "soft_skills", "culture_fit"):
        eid += 1
        cat_score = max(0, min(100, score + random.randint(-15, 10)))
        comment = random.choice([
            "Strong fundamentals.", "Needs more depth on edge cases.",
            "Communication was clear.", "Some hesitation on senior-level questions.",
            "Solid problem decomposition.", "Reasonable trade-off analysis.",
            None, None, None,
        ])
        print(
            f"INSERT INTO evaluations (id, interview_id, evaluator_id, category, score, comment) "
            f"VALUES ({eid}, {q(iid)}, {recruiter_id}, {q(category)}, {cat_score}, "
            f"{q(comment) if comment else 'NULL'});"
        )

print("COMMIT;")
