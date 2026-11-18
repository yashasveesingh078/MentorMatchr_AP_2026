# Database Normalization

**Project:** MentorMatchr – Faculty Mentor Allocation Platform  
**Database:** PostgreSQL 15 or newer  
**Schema file:** `schema.sql`  
**Implemented tables:** 15  
**Target normal form:** Boyce-Codd Normal Form (BCNF) for every implemented table

## 1. Introduction
Normalization is the process of organising the attributes of a database into relations so that every fact is stored exactly once, and every non-key attribute depends on the key, the whole key, and nothing but the key. Each step removes a specific kind of unwanted dependency, and with it a specific kind of anomaly:

| Normal form | Removes |
| --- | --- |
| 1NF | Non-atomic values and repeating groups |
| 2NF | Partial dependencies of non-prime attributes on part of a candidate key |
| 3NF | Transitive dependencies of non-prime attributes on non-key attributes |
| BCNF | Any non-trivial dependency whose determinant is not a superkey |
MentorMatchr stores faculty members together with their departments, domains, areas of expertise and technical keywords. It also stores hackathons, their problem statements (each with one domain and several keywords), the teams that take part, the problem each team selects, and the mentor assignments made by coordinators. Mentor matching compares a problem statement's domain and keywords with each faculty member's domains and keywords. That comparison is only reliable if each of those facts is stored once, in one place, so normalization matters directly to the platform's main job.

### Source of truth and conventions
The implemented schema in schema.sql is the source of truth for every table, column, key and constraint named in this document. Each table was created and tested on PostgreSQL 18 (the schema targets PostgreSQL 15 or newer).
Relations labelled (illustrative) are teaching steps used to show the normalization process. They are not tables in the database.
Relations labelled (implemented) exist in schema.sql with exactly the name and columns shown.
PK = primary key, CK = candidate key, AK = alternate key (a candidate key that is not the primary key), FK = foreign key.
Every dependency used in this document is either declared (enforced by a PRIMARY KEY, UNIQUE, CHECK, FOREIGN KEY or trigger) or a stated business rule from the table below. No other dependencies are assumed.
### Business rules used in the analysis
| ID | Rule | Status |
| --- | --- | --- |
| R1 | A department is identified by its code, and separately by its name. | Declared: UNIQUE (department_code), UNIQUE (department_name) |
| R2 | A faculty member is identified by employee_code, and separately by email. | Declared: both UNIQUE NOT NULL |
| R3 | A hackathon is identified by (hackathon_name, edition_year). | Declared: uq_hackathon_name_year |
| R4 | A problem statement code (ps_code) is unique within a hackathon, not globally. | Declared: uq_ps_code_per_hackathon |
| R5 | A team name is unique within a hackathon, not globally. | Declared: uq_team_name_per_hackathon |
| R6 | A problem statement belongs to exactly one domain. | Declared: problem_statement.domain_id NOT NULL FK |
| R7 | A team selects at most one problem statement, and only from its own hackathon. | Declared: team_problem_selection PK + trigger selection_same_hackathon |
| R8 | A faculty member has at most one primary domain. | Declared: partial unique index uq_faculty_one_primary_domain |
| R9 | A team has at most one ACTIVE mentor at a time; past mentors are kept as REPLACED / WITHDRAWN. | Declared: partial unique index uq_team_one_active_mentor |
| R10 | The same faculty member is recorded at most once per team. | Declared: uq_assignment_team_faculty |
| A1 | edition_year is an organiser-assigned edition label. It is not required to equal the year of start_date, so start_date → edition_year is not a dependency. | Assumed business rule |
| A2 | full_name, phone, title, description, venue and contact_email are not unique and determine no other attribute. | Assumed (no UNIQUE declared) |
| A3 | A faculty member's designation does not determine max_teams. Capacity is set per person. | Assumed business rule |
| A4 | match_score is a snapshot recorded when the assignment is made. It is not recomputed from the current keywords. | Assumed business rule |
| A5 | A faculty member's years_of_experience is recorded per expertise area, not once per faculty member. | Assumed business rule |
## 2. Initial Data Structure (Unnormalized Form)
### Single conceptual structure
Before any design, a coordinator might keep everything in one spreadsheet: one row per team, with every related detail written into that row. The problem statement, its keywords, the mentor and all of the mentor's profile go in the same row.

-- (illustrative) Unnormalized relation
MENTOR_MATCH_RECORD (
    hackathon,             -- 'CodeFest 2026'           (name + year combined)
    hackathon_dates,       -- '20-21 Nov 2026'          (two dates in one cell)
    venue,
    team_name, team_size, contact_email,
    ps_code, ps_title, ps_description, ps_difficulty,
    ps_domain,
    ps_keywords,           -- {Python, TensorFlow, OpenCV}            repeating group
    mentor_employee_code, mentor_name, mentor_email,
    mentor_designation, mentor_max_teams,
    mentor_department,     -- 'CSE - Computer Science and Engineering'
    mentor_domains,        -- {Artificial Intelligence*, Data Science} repeating group (* = primary)
    mentor_expertise,      -- {Computer Vision (8 yrs), Deep Learning (5 yrs)} repeating group of pairs
    mentor_keywords,       -- {Python, TensorFlow, OpenCV, PyTorch}   repeating group
    assigned_by, coordinator_email, assigned_at, match_score, status
)
### Sample data (illustrative)
| hackathon | hackathon_dates | team_name | ps_code | ps_title | ps_domain | ps_keywords | mentor_name | mentor_email | mentor_department | mentor_domains | mentor_expertise | mentor_keywords | assigned_by | match_score | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CodeFest 2026 | 20-21 Nov 2026 | ByteBuilders | PS-03 | Crop Disease Detection | Artificial Intelligence | Python, TensorFlow, OpenCV | Dr. R. Sharma | rsharma@inst.edu | CSE - Computer Science and Engineering | Artificial Intelligence*, Data Science | Computer Vision (8), Deep Learning (5) | Python, TensorFlow, OpenCV, PyTorch | P. Nair | 86.50 | ACTIVE |
| CodeFest 2026 | 20-21 Nov 2026 | NeuralNomads | PS-03 | Crop Disease Detection | Artificial Intelligence | Python, TensorFlow, OpenCV | Dr. R. Sharma | rsharma@inst.edu | CSE - Computer Science and Engineering | Artificial Intelligence*, Data Science | Computer Vision (8), Deep Learning (5) | Python, TensorFlow, OpenCV, PyTorch | P. Nair | 84.00 | ACTIVE |
| CodeFest 2026 | 20-21 Nov 2026 | WebWizards | PS-05 | Campus Event Portal | Web Development | React, Node.js, PostgreSQL | Dr. K. Iyer | kiyer@inst.edu | CSE - Computer Science and Engineering | Web Development* | Full-Stack Development (6) | React, Node.js, PostgreSQL | P. Nair | 91.00 | ACTIVE |
### Problems in the unnormalized form
Non-atomic values.

| Attribute | Why it is not atomic |
| --- | --- |
| hackathon | Holds two facts: name (CodeFest) and edition year (2026). |
| hackathon_dates | Holds a start date and an end date in one cell. |
| mentor_department | Holds the department code and the department name. |
Repeating groups and multivalued attributes.

| Attribute | Repeats per | Example |
| --- | --- | --- |
| ps_keywords | Problem statement | {Python, TensorFlow, OpenCV} |
| mentor_domains | Faculty member | {Artificial Intelligence*, Data Science} |
| mentor_expertise | Faculty member, and each element is a pair (area, years) | {Computer Vision (8), Deep Learning (5)} |
| mentor_keywords | Faculty member | {Python, TensorFlow, OpenCV, PyTorch} |
A query such as "find every faculty member who knows TensorFlow" would have to search inside a text list. Nothing can stop the same keyword being spelled TensorFlow, Tensorflow and TF in different rows.

Anomalies.

| Anomaly | MentorMatchr example |
| --- | --- |
| Insertion | A newly joined faculty member cannot be recorded until some team is assigned to them, because every row is a team. A problem statement cannot be published until a team selects it. A new keyword (e.g. Rust) cannot be added to the vocabulary on its own. |
| Update | Dr. R. Sharma's email, department, domains, expertise and keywords are copied into the row of every team Dr. Sharma mentors. Adding one new keyword such as PyTorch Lightning means editing every one of those rows. Missing one leaves contradictory profiles, and the matching engine then gives inconsistent results. The same applies to PS-03's title and keywords, which are repeated for every team that selects it. |
| Deletion | If WebWizards withdraws and its row is deleted, the only record of problem statement PS-05 is lost, along with Dr. K. Iyer's entire faculty profile. |
## 3. First Normal Form (1NF)
### Definition
A relation is in 1NF if every attribute holds a single atomic value from its domain (no lists, sets or composite cells), there are no repeating groups, and every tuple is uniquely identified by a key.

### Steps applied
Split composite cells into atomic attributes.
hackathon → hackathon_name, edition_year
hackathon_dates → start_date, end_date
mentor_department → department_code, department_name
Remove each repeating group into its own relation. The new relation holds the key of the parent plus one element of the group per row. This is Codd's original 1NF procedure.
Why not just flatten everything into one table? A single flat table with one row per combination would also be atomic. But the four repeating groups are independent of one another. A problem's keywords have nothing to do with the mentor's domains. Flattening ByteBuilders alone would need 3 PS keywords × 2 mentor domains × 2 expertise areas × 4 mentor keywords = 48 rows to say what the UNF says in one. Those independent multivalued facts (formally, multivalued dependencies) are therefore separated now.

### Resulting 1NF relations (illustrative)
-- R1: one row per (team, mentor) pair; previous mentors are kept with status REPLACED/WITHDRAWN
TEAM_ASSIGNMENT_1NF (
    hackathon_name, edition_year, team_name, employee_code,   -- composite key
    start_date, end_date, venue,
    team_size, contact_email,
    ps_code, ps_title, ps_description, ps_difficulty, ps_domain_name,
    faculty_name, faculty_email, designation, max_teams,
    department_code, department_name,
    coordinator_email, coordinator_name,
    assigned_at, match_score, status
)
KEY (hackathon_name, edition_year, team_name, employee_code)

-- R2: problem statement keywords
PS_KEYWORD_1NF (hackathon_name, edition_year, ps_code, keyword_name)
KEY (hackathon_name, edition_year, ps_code, keyword_name)

-- R3: faculty domains
FACULTY_DOMAIN_1NF (employee_code, domain_name, is_primary)
KEY (employee_code, domain_name)

-- R4: faculty areas of expertise
FACULTY_EXPERTISE_1NF (employee_code, expertise_name, years_of_experience)
KEY (employee_code, expertise_name)

-- R5: faculty technical keywords
FACULTY_KEYWORD_1NF (employee_code, keyword_name)
KEY (employee_code, keyword_name)
ps_code alone is not part of R2's key: by rule R4 it is unique only within a hackathon, so the hackathon's key must accompany it.

### Sample 1NF data (illustrative)
FACULTY_KEYWORD_1NF

| employee_code | keyword_name |
| --- | --- |
| FAC101 | Python |
| FAC101 | TensorFlow |
| FAC101 | OpenCV |
| FAC101 | PyTorch |
| FAC205 | React |
| FAC205 | Node.js |
| FAC205 | PostgreSQL |
FACULTY_EXPERTISE_1NF

| employee_code | expertise_name | years_of_experience |
| --- | --- | --- |
| FAC101 | Computer Vision | 8 |
| FAC101 | Deep Learning | 5 |
| FAC205 | Full-Stack Development | 6 |
FACULTY_DOMAIN_1NF

| employee_code | domain_name | is_primary |
| --- | --- | --- |
| FAC101 | Artificial Intelligence | true |
| FAC101 | Data Science | false |
| FAC205 | Web Development | true |
PS_KEYWORD_1NF

| hackathon_name | edition_year | ps_code | keyword_name |
| --- | --- | --- | --- |
| CodeFest | 2026 | PS-03 | Python |
| CodeFest | 2026 | PS-03 | TensorFlow |
| CodeFest | 2026 | PS-03 | OpenCV |
| CodeFest | 2026 | PS-05 | React |
### Result of 1NF
| Achieved | Still wrong |
| --- | --- |
| Every cell is atomic, so keywords can be searched with = and joined. | R1 still repeats hackathon, team, problem, faculty, department and coordinator details on every row. |
| Each keyword, domain and expertise link is a separate row. | A faculty member still cannot exist in R1 without a team (insertion anomaly). |
| Each relation has a defined key. | Deleting the last assignment of a team still deletes the team (deletion anomaly). |
## 4. Second Normal Form (2NF)
### Definitions
A prime attribute belongs to at least one candidate key. A non-prime attribute belongs to none.
Full functional dependency: X → A is full if A does not depend on any proper subset of X.
Partial dependency: a non-prime attribute depends on a proper subset of a candidate key.
A relation is in 2NF if it is in 1NF and no non-prime attribute is partially dependent on any candidate key.
A partial dependency can exist only when a candidate key has two or more attributes. A relation whose candidate keys are all single attributes is automatically in 2NF.

### Candidate key of R1
Let K = {hackathon_name, edition_year, team_name, employee_code}.

A team is identified only within its hackathon (rule R5), so hackathon_name, edition_year, team_name together name the team.
A team may have several mentors over time (rule R9 keeps the history), so employee_code is needed to separate the rows.
No proper subset identifies a row, so K is a candidate key. Because faculty_email also identifies a faculty member (rule R2), {hackathon_name, edition_year, team_name, faculty_email} is a second candidate key. It produces the same partial dependencies.
### Functional dependencies in R1
FD1:  {hackathon_name, edition_year}             -> {start_date, end_date, venue}
FD2:  {hackathon_name, edition_year, team_name}  -> {team_size, contact_email, ps_code}
FD3:  {hackathon_name, edition_year, ps_code}    -> {ps_title, ps_description, ps_difficulty, ps_domain_name}
FD4:  {employee_code}  -> {faculty_name, faculty_email, designation, max_teams, department_code}
FD5:  {faculty_email}  -> {employee_code}
FD6:  {department_code} -> {department_name}
FD7:  {coordinator_email} -> {coordinator_name}
FD8:  K -> {coordinator_email, assigned_at, match_score, status}
| FD | Determinant ⊂ K? | Type | Effect |
| --- | --- | --- | --- |
| FD1 | Yes, {hackathon_name, edition_year} | Partial | Hackathon dates repeat for every team and mentor |
| FD2 | Yes, {hackathon_name, edition_year, team_name} | Partial | Team details repeat for every mentor of the team |
| FD2 + FD3 | ps_title etc. depend on {hackathon_name, edition_year, team_name} ⊂ K, through ps_code | Partial (via the team) | Problem details repeat per mentor |
| FD4 | Yes, {employee_code} | Partial | Faculty profile repeats for every team mentored |
| FD8 | No, the whole of K | Full | Correct: these describe one specific assignment |
### Decomposition into 2NF (illustrative)
Each partial dependency is moved into a relation keyed by the subset of K that determines it:

HACKATHON_2NF  (hackathon_name, edition_year, start_date, end_date, venue)
KEY (hackathon_name, edition_year)

TEAM_2NF       (hackathon_name, edition_year, team_name, team_size, contact_email,
                ps_code, ps_title, ps_description, ps_difficulty, ps_domain_name)
KEY (hackathon_name, edition_year, team_name)

FACULTY_2NF    (employee_code, faculty_name, faculty_email, designation, max_teams,
                department_code, department_name)
CK  (employee_code), (faculty_email)

ASSIGNMENT_2NF (hackathon_name, edition_year, team_name, employee_code,
                coordinator_email, coordinator_name, assigned_at, match_score, status)
KEY (hackathon_name, edition_year, team_name, employee_code)
R2 to R5 from 1NF are already in 2NF:

| Relation | Candidate key | Non-prime attributes | 2NF reason |
| --- | --- | --- | --- |
| PS_KEYWORD_1NF | all four attributes | none | No non-prime attribute exists, so no partial dependency is possible |
| FACULTY_KEYWORD_1NF | (employee_code, keyword_name) | none | Same as above |
| FACULTY_DOMAIN_1NF | (employee_code, domain_name) | is_primary | is_primary describes the pair. Neither the faculty alone nor the domain alone determines it. |
| FACULTY_EXPERTISE_1NF | (employee_code, expertise_name) | years_of_experience | By rule A5, years are per expertise area, so the dependency is on the whole key |
If years_of_experience were stored once per faculty member (total teaching experience), it would depend on employee_code alone. That would be a partial dependency, and the column would belong in FACULTY. Rule A5 is what places it in the link table.

### Why the 2NF relations are correct
HACKATHON_2NF, TEAM_2NF and ASSIGNMENT_2NF each have one composite key. Every non-prime attribute depends on the whole key and on no proper subset. For example, {hackathon_name, edition_year} alone does not determine team_size, because a hackathon has many teams.
FACULTY_2NF has only single-attribute candidate keys, so it cannot have a partial dependency.
### 2NF check on implemented tables with composite candidate keys
2NF applies to every candidate key, including alternate keys. These are all the composite candidate keys in the implemented schema:

| Implemented table | Composite candidate key | Non-prime attributes | Can a proper subset determine a non-prime attribute? |
| --- | --- | --- | --- |
| hackathon | (hackathon_name, edition_year), AK | start_date, end_date, venue | No. A name recurs across years, and a year has many hackathons. |
| problem_statement | (hackathon_id, ps_code), AK | title, description, domain_id, difficulty | No. A hackathon has many problems, and ps_code repeats across hackathons (R4). |
| team | (hackathon_id, team_name), AK | team_size, contact_email, registered_at | No. A hackathon has many teams, and team names repeat across hackathons (R5). |
| mentor_assignment | (team_id, faculty_id), AK | assigned_by, assigned_at, match_score, status | No. A team has a history of mentors, and a faculty member mentors many teams. |
| faculty_expertise | (faculty_id, expertise_id), PK | years_of_experience | No (rule A5) |
| faculty_domain | (faculty_id, domain_id), PK | is_primary | No |
| faculty_keyword | (faculty_id, keyword_id), PK | none | Not applicable |
| problem_keyword | (problem_id, keyword_id), PK | none | Not applicable |
The other implemented tables (department, domain, keyword, expertise_area, faculty, coordinator, team_problem_selection) have only single-attribute candidate keys, so they are in 2NF by definition.

## 5. Third Normal Form (3NF)
### Definition
A relation is in 3NF if it is in 2NF and, for every non-trivial functional dependency X → A, at least one of these holds:

X is a superkey, or
A is a prime attribute.
The usual violation is a transitive dependency: Key → Y and Y → A, where Y is not a superkey and A is non-prime.

### Transitive dependencies remaining after 2NF
| Relation | Chain | Why Y is not a superkey | Anomaly it causes |
| --- | --- | --- | --- |
| TEAM_2NF | (hackathon, team_name) → ps_code → ps_title, ps_description, ps_difficulty, ps_domain_name (within the same hackathon) | Many teams pick the same ps_code | PS-03's title is stored once per team that picks it. A problem with no team yet cannot be stored. |
| FACULTY_2NF | employee_code → department_code → department_name | Many faculty share a department | Renaming a department means editing every faculty row |
| ASSIGNMENT_2NF | K → coordinator_email → coordinator_name | One coordinator makes many assignments | A coordinator exists only once they have made an assignment |
### Decomposition into 3NF (illustrative, natural keys)
HACKATHON_3NF         (hackathon_name, edition_year, start_date, end_date, venue)
                      KEY (hackathon_name, edition_year)

PROBLEM_STATEMENT_3NF (hackathon_name, edition_year, ps_code,
                       ps_title, ps_description, ps_difficulty, domain_name)
                      KEY (hackathon_name, edition_year, ps_code)

TEAM_3NF              (hackathon_name, edition_year, team_name,
                       team_size, contact_email, ps_code)
                      KEY (hackathon_name, edition_year, team_name)

DEPARTMENT_3NF        (department_code, department_name)
                      CK (department_code), (department_name)

FACULTY_3NF           (employee_code, faculty_name, faculty_email, designation,
                       max_teams, department_code)
                      CK (employee_code), (faculty_email)

COORDINATOR_3NF       (coordinator_email, coordinator_name)
                      KEY (coordinator_email)

ASSIGNMENT_3NF        (hackathon_name, edition_year, team_name, employee_code,
                       coordinator_email, assigned_at, match_score, status)
                      KEY (hackathon_name, edition_year, team_name, employee_code)

-- unchanged from 1NF / 2NF
PS_KEYWORD_1NF, FACULTY_DOMAIN_1NF, FACULTY_EXPERTISE_1NF, FACULTY_KEYWORD_1NF
### Master relations for shared vocabularies
domain_name, keyword_name and expertise_name now appear as plain values in several relations. Strictly, 3NF does not require a separate table for a value that carries no other attributes. Three master relations are still introduced, for the following reasons:

| Master relation | Reason |
| --- | --- |
| DOMAIN (domain_name, description) | A domain has its own attribute (description). Storing it beside every faculty-domain row would create the transitive chain (employee_code, domain_name) → domain_name → description. |
| KEYWORD (keyword_name) | Gives one controlled list for both faculty and problem keywords, so TensorFlow cannot be spelled two ways and matching compares identical values. Removes the insertion anomaly of not being able to add a keyword on its own. |
| EXPERTISE_AREA (expertise_name) | Same reasons as KEYWORD, for expertise areas. |
### 3NF verification (illustrative relations)
| Relation | Non-trivial FDs | Every determinant a superkey? | 3NF |
| --- | --- | --- | --- |
| HACKATHON_3NF | (name, year) → rest | Yes | ✓ |
| PROBLEM_STATEMENT_3NF | (name, year, ps_code) → rest | Yes | ✓ |
| TEAM_3NF | (name, year, team_name) → rest | Yes. ps_code alone determines nothing here, because it is unique only within a hackathon (R4). | ✓ |
| DEPARTMENT_3NF | code → name, name → code | Yes, both are CKs | ✓ |
| FACULTY_3NF | employee_code → rest, faculty_email → rest | Yes, both are CKs | ✓ |
| COORDINATOR_3NF | email → name | Yes | ✓ |
| ASSIGNMENT_3NF | K → rest | Yes | ✓ |
| FACULTY_DOMAIN / EXPERTISE / KEYWORD, PS_KEYWORD | key → remaining attribute (or none) | Yes | ✓ |
## 6. Boyce-Codd Normal Form (BCNF)
### Definition
A relation R is in BCNF if, for every non-trivial functional dependency X → A that holds in R, X is a superkey of R.

BCNF is stricter than 3NF because it removes the exception "or A is a prime attribute". A relation can be in 3NF but not BCNF when a non-key attribute determines part of a candidate key. This exact situation came up while implementing MentorMatchr (Section 6.3).

### From illustrative relations to implemented tables
The implemented schema replaces natural keys with surrogate identity keys (GENERATED ALWAYS AS IDENTITY) and keeps every natural key as a declared UNIQUE alternate key. Surrogate keys are short, never change, and make foreign keys simple. Introducing them adds new attributes, though, so the dependencies must be checked again.

| Illustrative relation | Implemented table(s) |
| --- | --- |
| DEPARTMENT_3NF | department |
| FACULTY_3NF | faculty |
| DOMAIN | domain |
| KEYWORD | keyword |
| EXPERTISE_AREA | expertise_area |
| FACULTY_EXPERTISE_1NF | faculty_expertise |
| FACULTY_DOMAIN_1NF | faculty_domain |
| FACULTY_KEYWORD_1NF | faculty_keyword |
| HACKATHON_3NF | hackathon |
| COORDINATOR_3NF | coordinator |
| PROBLEM_STATEMENT_3NF | problem_statement |
| PS_KEYWORD_1NF | problem_keyword |
| TEAM_3NF | team and team_problem_selection (see 6.3) |
| ASSIGNMENT_3NF | mentor_assignment |
### The BCNF violation found and removed: team
A first implementation draft put the selected problem directly in team as a surrogate FK:

-- (illustrative) first draft, NOT implemented
TEAM_DRAFT (team_id, hackathon_id, team_name, team_size, contact_email, problem_id, registered_at)
CK  (team_id), (hackathon_id, team_name)
With surrogate keys, problem_id identifies a problem globally. In problem_statement, problem_id → hackathon_id. Rule R7 requires a team's problem to come from the team's own hackathon. So, inside TEAM_DRAFT:

FD:  problem_id -> hackathon_id
| Check | Result |
| --- | --- |
| Is problem_id a superkey of TEAM_DRAFT? | No. Many teams can select the same problem. |
| Is hackathon_id prime? | Yes. It is part of the candidate key (hackathon_id, team_name). |
| 3NF? | Yes, through the "prime attribute" exception |
| BCNF? | No. The determinant is not a superkey. |
The redundancy is real. For every team that picks problem 7, the row repeats the fact "problem 7 belongs to hackathon 1", which problem_statement already records.

Decomposition used in the implementation:

-- (implemented)
team                   (team_id PK, hackathon_id, team_name, team_size, contact_email, registered_at)
                       AK (hackathon_id, team_name)

-- (implemented)
team_problem_selection (team_id PK/FK, problem_id FK, selected_at)
In team_problem_selection the only non-trivial FD is team_id → problem_id, selected_at. team_id is the key, so the table is in BCNF. problem_id → hackathon_id cannot hold here because hackathon_id is not an attribute of this table.
The decomposition is lossless: the common attribute team_id is a key of team_problem_selection.
A side benefit: team no longer has a nullable problem_id. A team that has not chosen a problem simply has no selection row.
Trade-off: dependency preservation. BCNF decomposition is not always dependency-preserving. Rule R7 (same hackathon) now involves three tables, so no single-table constraint can express it. The schema enforces it with two triggers:

| Trigger | Table | Purpose |
| --- | --- | --- |
| selection_same_hackathon | team_problem_selection | Rejects an insert or update when the team's hackathon_id differs from the problem's hackathon_id |
| team_hackathon_immutable, problem_hackathon_immutable | team, problem_statement | Block changes to hackathon_id, so the check above cannot be bypassed later |
All three triggers were tested: selecting a problem from another hackathon, and moving a team or problem to another hackathon, are each rejected.

### Conditional constraints are not functional dependencies
Two declared rules are partial unique indexes. They restrict only a subset of rows, so they do not create functional dependencies over the whole relation:

| Index | Rule | Why it is not an FD of the table |
| --- | --- | --- |
| uq_faculty_one_primary_domain ON faculty_domain (faculty_id) WHERE is_primary | R8 | A faculty member still has many domain rows (all but one non-primary), so faculty_id → domain_id does not hold in faculty_domain. |
| uq_team_one_active_mentor ON mentor_assignment (team_id) WHERE status = 'ACTIVE' | R9 | A team has several assignment rows over time, so team_id → faculty_id does not hold in mentor_assignment. |
### Table-by-table BCNF analysis of the implemented schema
For each table, the candidate keys come from declared PRIMARY KEY / UNIQUE constraints, and the FDs come from Section 1.2.

## 1. department
department (department_id PK, department_code AK, department_name AK)
FD: department_id   -> department_code, department_name
FD: department_code -> department_id, department_name
FD: department_name -> department_id, department_code
All three determinants are declared candidate keys. BCNF ✓

## 2. domain
domain (domain_id PK, domain_name AK, description)
FD: domain_id   -> domain_name, description
FD: domain_name -> domain_id, description
description is not unique and determines nothing (A2). BCNF ✓

## 3. keyword
keyword (keyword_id PK, keyword_name AK)
FD: keyword_id <-> keyword_name
Both determinants are candidate keys. BCNF ✓

## 4. expertise_area
expertise_area (expertise_id PK, expertise_name AK)
FD: expertise_id <-> expertise_name
BCNF ✓

## 5. faculty
faculty (faculty_id PK, employee_code AK, full_name, email AK, phone,
         designation, department_id FK, max_teams, is_available)
FD: faculty_id    -> all other attributes
FD: employee_code -> all other attributes
FD: email         -> all other attributes
| Possible determinant | Is it a determinant? | Reason |
| --- | --- | --- |
| department_id | No | Many faculty share a department. The department's name lives in department. |
| designation | No | Capacity is set per person (A3), and many faculty share a designation |
| full_name, phone | No | Not declared unique (A2) |
All determinants are candidate keys. BCNF ✓

## 6. faculty_expertise
faculty_expertise (faculty_id PK/FK, expertise_id PK/FK, years_of_experience)
FD: {faculty_id, expertise_id} -> years_of_experience
Neither faculty_id nor expertise_id alone determines years_of_experience (A5). BCNF ✓

## 7. faculty_domain
faculty_domain (faculty_id PK/FK, domain_id PK/FK, is_primary)
FD: {faculty_id, domain_id} -> is_primary
The partial unique index for R8 is not an FD (Section 6.4). BCNF ✓

## 8. faculty_keyword
faculty_keyword (faculty_id PK/FK, keyword_id PK/FK)
All-key relation. Only trivial FDs hold. BCNF ✓

## 9. hackathon
hackathon (hackathon_id PK, hackathon_name, edition_year, start_date, end_date, venue)
AK (hackathon_name, edition_year)
FD: hackathon_id                   -> all other attributes
FD: {hackathon_name, edition_year} -> all other attributes
| Possible determinant | Is it a determinant? | Reason |
| --- | --- | --- |
| start_date → edition_year | No, by rule A1 | If the institute required edition_year = EXTRACT(YEAR FROM start_date), this FD would hold with a non-superkey determinant and violate BCNF. edition_year would then have to be dropped and derived instead. |
| venue | No | Not unique (A2) |
chk_hackathon_dates (end_date >= start_date) is a CHECK on a single row, not an FD. BCNF ✓ (relies on rule A1)

## 10. coordinator
coordinator (coordinator_id PK, full_name, email AK, phone)
FD: coordinator_id -> full_name, email, phone
FD: email          -> coordinator_id, full_name, phone
BCNF ✓

## 11. problem_statement
problem_statement (problem_id PK, hackathon_id FK, ps_code, title, description,
                   domain_id FK, difficulty)
AK (hackathon_id, ps_code)
FD: problem_id              -> all other attributes
FD: {hackathon_id, ps_code} -> all other attributes
| Possible determinant | Is it a determinant? | Reason |
| --- | --- | --- |
| ps_code alone | No | Repeats across hackathons (R4) |
| title | No | Not declared unique (A2) |
| domain_id | No | Many problems share a domain |
BCNF ✓

## 12. problem_keyword
problem_keyword (problem_id PK/FK, keyword_id PK/FK)
All-key relation. BCNF ✓

## 13. team
team (team_id PK, hackathon_id FK, team_name, team_size, contact_email, registered_at)
AK (hackathon_id, team_name)
FD: team_id                   -> all other attributes
FD: {hackathon_id, team_name} -> all other attributes
contact_email is not unique and determines nothing (A2). The violation problem_id → hackathon_id was removed by the decomposition in Section 6.3. BCNF ✓

## 14. team_problem_selection
team_problem_selection (team_id PK/FK, problem_id FK, selected_at)
FD: team_id -> problem_id, selected_at
problem_id does not determine team_id, because many teams may pick one problem. BCNF ✓

## 15. mentor_assignment
mentor_assignment (assignment_id PK, team_id FK, faculty_id FK, assigned_by FK,
                   assigned_at, match_score, status)
AK (team_id, faculty_id)
FD: assignment_id         -> all other attributes
FD: {team_id, faculty_id} -> all other attributes
| Possible determinant | Is it a determinant? | Reason |
| --- | --- | --- |
| team_id → faculty_id | No | A team keeps a history of mentors. Only the ACTIVE subset is unique (Section 6.4). |
| {team_id, faculty_id} → match_score via the keyword tables | No | match_score is a recorded snapshot (A4), not computed from other columns of this table |
| assigned_by | No | One coordinator makes many assignments |
BCNF ✓

### BCNF summary
| No. | Table | Candidate keys | Non-key determinants? | BCNF |
| --- | --- | --- | --- | --- |
| 1 | department | department_id; department_code; department_name | None | ✓ |
| 2 | domain | domain_id; domain_name | None | ✓ |
| 3 | keyword | keyword_id; keyword_name | None | ✓ |
| 4 | expertise_area | expertise_id; expertise_name | None | ✓ |
| 5 | faculty | faculty_id; employee_code; email | None | ✓ |
| 6 | faculty_expertise | (faculty_id, expertise_id) | None | ✓ |
| 7 | faculty_domain | (faculty_id, domain_id) | None | ✓ |
| 8 | faculty_keyword | (faculty_id, keyword_id) | None (all-key) | ✓ |
| 9 | hackathon | hackathon_id; (hackathon_name, edition_year) | None, given rule A1 | ✓ |
| 10 | coordinator | coordinator_id; email | None | ✓ |
| 11 | problem_statement | problem_id; (hackathon_id, ps_code) | None | ✓ |
| 12 | problem_keyword | (problem_id, keyword_id) | None (all-key) | ✓ |
| 13 | team | team_id; (hackathon_id, team_name) | None, after the 6.3 decomposition | ✓ |
| 14 | team_problem_selection | team_id | None | ✓ |
| 15 | mentor_assignment | assignment_id; (team_id, faculty_id) | None | ✓ |
## 7. Final Normalized Database Structure
### Tables
| No. | Table | Description |
| --- | --- | --- |
| 1 | department | Academic departments (code and name) that faculty belong to |
| 2 | domain | Master list of technical domains (e.g. Artificial Intelligence, Web Development), shared by faculty and problem statements |
| 3 | keyword | Master list of technical keywords (e.g. Python, React), shared by faculty and problem statements |
| 4 | expertise_area | Master list of named areas of expertise (e.g. Computer Vision) |
| 5 | faculty | Faculty members: identity, contact, designation, department, mentoring capacity and availability |
| 6 | faculty_expertise | Faculty ↔️ expertise area link, with years of experience in that area |
| 7 | faculty_domain | Faculty ↔️ domain link, marking at most one primary domain |
| 8 | faculty_keyword | Faculty ↔️ keyword link |
| 9 | hackathon | Hackathon events (name, edition year, dates, venue) |
| 10 | coordinator | Hackathon coordinators who manage the platform and make assignments |
| 11 | problem_statement | Problem statements of a hackathon, each with one domain and a difficulty |
| 12 | problem_keyword | Problem statement ↔️ keyword link |
| 13 | team | Teams registered for a hackathon |
| 14 | team_problem_selection | The problem statement a team has selected (at most one per team) |
| 15 | mentor_assignment | Faculty mentors assigned to teams, with the assigning coordinator, match score and status history |
### Relationship overview
department      1 ──< faculty
faculty         1 ──< faculty_expertise >── 1 expertise_area
faculty         1 ──< faculty_domain    >── 1 domain
faculty         1 ──< faculty_keyword   >── 1 keyword
hackathon       1 ──< problem_statement >── 1 domain
problem_statement 1 ──< problem_keyword >── 1 keyword
hackathon       1 ──< team
team            1 ──o team_problem_selection >── 1 problem_statement   (0..1 selection per team)
team            1 ──< mentor_assignment >── 1 faculty
coordinator     1 ──< mentor_assignment
| Relationship | Cardinality | Implemented by |
| --- | --- | --- |
| Department to faculty | 1 : N | faculty.department_id |
| Faculty to expertise areas | M : N | faculty_expertise |
| Faculty to domains | M : N | faculty_domain |
| Faculty to keywords | M : N | faculty_keyword |
| Hackathon to problem statements | 1 : N | problem_statement.hackathon_id |
| Domain to problem statements | 1 : N | problem_statement.domain_id |
| Problem statements to keywords | M : N | problem_keyword |
| Hackathon to teams | 1 : N | team.hackathon_id |
| Team to selected problem | N : 1 (team side optional, at most one) | team_problem_selection |
| Team to faculty (mentoring) | M : N, with history | mentor_assignment |
| Coordinator to assignments | 1 : N | mentor_assignment.assigned_by |
### Primary and foreign keys
| Table | Primary key | Foreign keys (→ referenced table, on delete) |
| --- | --- | --- |
| department | department_id | none |
| domain | domain_id | none |
| keyword | keyword_id | none |
| expertise_area | expertise_id | none |
| faculty | faculty_id | department_id → department (RESTRICT) |
| faculty_expertise | (faculty_id, expertise_id) | faculty_id → faculty (CASCADE); expertise_id → expertise_area (RESTRICT) |
| faculty_domain | (faculty_id, domain_id) | faculty_id → faculty (CASCADE); domain_id → domain (RESTRICT) |
| faculty_keyword | (faculty_id, keyword_id) | faculty_id → faculty (CASCADE); keyword_id → keyword (RESTRICT) |
| hackathon | hackathon_id | none |
| coordinator | coordinator_id | none |
| problem_statement | problem_id | hackathon_id → hackathon (CASCADE); domain_id → domain (RESTRICT) |
| problem_keyword | (problem_id, keyword_id) | problem_id → problem_statement (CASCADE); keyword_id → keyword (RESTRICT) |
| team | team_id | hackathon_id → hackathon (CASCADE) |
| team_problem_selection | team_id | team_id → team (CASCADE); problem_id → problem_statement (NO ACTION, DEFERRABLE INITIALLY DEFERRED) |
| mentor_assignment | assignment_id | team_id → team (CASCADE); faculty_id → faculty (RESTRICT); assigned_by → coordinator (RESTRICT) |
RESTRICT on master data (domains, keywords, expertise areas, departments, faculty with assignments, coordinators) stops a delete from silently removing history. CASCADE is used only where the child rows have no meaning without the parent, such as a faculty member's keyword links or a team's selection.

team_problem_selection.problem_id is declared DEFERRABLE INITIALLY DEFERRED, so it is checked at commit. Deleting a problem that a team has selected is still refused. Deleting a whole hackathon succeeds, because by commit time the cascade hackathon → team → team_problem_selection has also removed the selections. During testing, an immediate check (RESTRICT or plain NO ACTION) fired part-way through that cascade and blocked the hackathon delete.

### Unique constraints (alternate keys)
| Table | Unique column(s) | Constraint / index |
| --- | --- | --- |
| department | department_code | column UNIQUE |
| department | department_name | column UNIQUE |
| domain | domain_name | column UNIQUE |
| keyword | keyword_name | column UNIQUE |
| expertise_area | expertise_name | column UNIQUE |
| faculty | employee_code | column UNIQUE |
| faculty | email | column UNIQUE |
| hackathon | (hackathon_name, edition_year) | uq_hackathon_name_year |
| coordinator | email | column UNIQUE |
| problem_statement | (hackathon_id, ps_code) | uq_ps_code_per_hackathon |
| team | (hackathon_id, team_name) | uq_team_name_per_hackathon |
| mentor_assignment | (team_id, faculty_id) | uq_assignment_team_faculty |
| faculty_domain | faculty_id where is_primary | partial unique index uq_faculty_one_primary_domain |
| mentor_assignment | team_id where status = 'ACTIVE' | partial unique index uq_team_one_active_mentor |
### NOT NULL constraints
Every primary key and foreign key column is NOT NULL. Among the remaining columns, only these five are nullable. Every other column in the schema is NOT NULL.

| Table | Nullable column | Reason |
| --- | --- | --- |
| domain | description | Optional explanatory text |
| faculty | phone | Contact number may be unavailable |
| hackathon | venue | May be announced later or held online |
| coordinator | phone | Contact number may be unavailable |
| mentor_assignment | match_score | A coordinator may assign a mentor manually, without a computed score |
### CHECK constraints
| Table | Column(s) | Condition |
| --- | --- | --- |
| faculty | designation | IN ('Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer') |
| faculty | max_teams | BETWEEN 1 AND 10 (default 3) |
| faculty_expertise | years_of_experience | BETWEEN 0 AND 60 |
| hackathon | edition_year | BETWEEN 2000 AND 2100 |
| hackathon | start_date, end_date | chk_hackathon_dates: end_date >= start_date |
| problem_statement | difficulty | IN ('Easy', 'Medium', 'Hard') |
| team | team_size | BETWEEN 1 AND 6 |
| mentor_assignment | match_score | BETWEEN 0 AND 100 |
| mentor_assignment | status | IN ('ACTIVE', 'REPLACED', 'WITHDRAWN') (default 'ACTIVE') |
### Business rules enforced by the database
| Rule | Enforced by |
| --- | --- |
| Each department, domain, keyword, expertise area, faculty member and coordinator is stored once | Single-column UNIQUE alternate keys |
| No duplicate faculty-keyword, faculty-domain, faculty-expertise or problem-keyword pair | Composite primary keys of the link tables |
| A problem code and a team name are unique within their hackathon | uq_ps_code_per_hackathon, uq_team_name_per_hackathon |
| Every problem statement has exactly one domain | problem_statement.domain_id NOT NULL + FK |
| A team selects at most one problem, from its own hackathon | team_problem_selection PK + trigger selection_same_hackathon |
| Teams and problems cannot move between hackathons | Triggers team_hackathon_immutable, problem_hackathon_immutable |
| At most one primary domain per faculty member | uq_faculty_one_primary_domain |
| At most one active mentor per team; full assignment history is kept | uq_team_one_active_mentor + status CHECK |
| A faculty member is not recorded twice for the same team | uq_assignment_team_faculty |
| Every assignment records which coordinator made it | mentor_assignment.assigned_by NOT NULL + FK |
### Rules NOT enforced by the schema
These rules matter to the workflow, but schema.sql does not enforce them. They must be checked by the assignment logic, or by triggers added later:

| Rule | Why it is not enforced declaratively |
| --- | --- |
| A faculty member's number of ACTIVE assignments must not exceed max_teams | Needs a count across rows; a CHECK constraint cannot do this |
| Only faculty with is_available = TRUE should receive new assignments | Spans faculty and mentor_assignment; no trigger is implemented for it |
| A team should have selected a problem before a mentor is assigned | Spans team_problem_selection and mentor_assignment; no trigger is implemented for it |
| Keyword and domain names are compared exactly, so python and Python would be two different keywords | UNIQUE is case-sensitive in PostgreSQL; no case-insensitive index is defined |
## 8. Anomalies Prevented Through Normalization
### Insertion anomalies
| Before (UNF) | After (implemented schema) |
| --- | --- |
| A faculty member could not be added without a team | Insert into faculty (plus faculty_domain, faculty_keyword and faculty_expertise) at any time |
| A problem statement could not be published until a team picked it | Insert into problem_statement and problem_keyword as soon as the hackathon exists |
| A team could not register before choosing a problem and receiving a mentor | Insert into team; team_problem_selection and mentor_assignment rows are added later |
| A new keyword or domain could not be added on its own | Insert into keyword or domain directly |
### Update anomalies
| Before (UNF) | After (implemented schema) |
| --- | --- |
| Dr. R. Sharma's email was copied into the row of every team Dr. Sharma mentors | Stored once in faculty.email |
| Adding a keyword to a mentor meant editing every team row | One INSERT into faculty_keyword |
| PS-03's title was repeated for every team that selected it | Stored once in problem_statement.title |
| Renaming a department meant editing every faculty row | One UPDATE on department.department_name |
| A keyword misspelled in one row silently broke matching | keyword_name exists once; link tables reference it by keyword_id |
### Deletion anomalies
| Before (UNF) | After (implemented schema) |
| --- | --- |
| Deleting the only team on PS-05 lost the problem statement (and a selected problem cannot be deleted while a team still depends on it) | Deleting a team cascades only to its team_problem_selection and mentor_assignment rows. problem_statement is untouched. |
| Deleting that team also lost Dr. K. Iyer's profile | faculty rows are independent of teams. Deleting a faculty member who has assignments is blocked (RESTRICT). |
| Removing a keyword from the vocabulary could silently strip it from profiles | ON DELETE RESTRICT on keyword_id blocks deleting a keyword still in use |
### Data redundancy
| Fact | Stored in exactly one place |
| --- | --- |
| Hackathon dates and venue | hackathon |
| Problem title, description, domain and difficulty | problem_statement |
| Faculty identity, contact, designation and capacity | faculty |
| Department name | department |
| Coordinator name and contact | coordinator |
| Which hackathon a problem belongs to | problem_statement.hackathon_id only (not repeated in team_problem_selection; see 6.3) |
### Relationship duplication
| Duplicate relationship | Prevented by |
| --- | --- |
| Same keyword linked twice to a faculty member | PK (faculty_id, keyword_id) |
| Same keyword linked twice to a problem | PK (problem_id, keyword_id) |
| Same domain linked twice to a faculty member | PK (faculty_id, domain_id) |
| Same expertise linked twice to a faculty member, with conflicting years | PK (faculty_id, expertise_id) |
| Two selected problems for one team | PK (team_id) of team_problem_selection |
| Two active mentors for one team | uq_team_one_active_mentor |
| The same mentor recorded twice for one team | uq_assignment_team_faculty |
## 9. Benefits of Normalization
### Benefits for the mentor-matching workflow
| Workflow step | How the normalized design helps |
| --- | --- |
| ## 1. Coordinator sets up faculty profiles | Domains, expertise and keywords are chosen from shared master lists. A faculty member's profile is complete before any hackathon begins. |
| ## 2. Coordinator publishes problem statements | Each problem has one domain and a set of keywords drawn from the same keyword list the faculty use, so the two sides are directly comparable. |
| ## 3. Team selects a problem | One row in team_problem_selection. The trigger guarantees the problem comes from the team's own hackathon. |
| ## 4. Matching engine ranks mentors | Matching is a join on integer IDs (keyword_id, domain_id), not text comparison inside lists. |
| ## 5. Coordinator assigns a mentor | One mentor_assignment row. The database blocks a second active mentor, and replacing a mentor keeps the history. |
Example ranking query supported by the schema (tested against schema.sql; it is not part of the schema file):

-- Rank available faculty for the problem selected by team 1
SELECT f.faculty_id,
       f.full_name,
       COUNT(DISTINCT fk.keyword_id)     AS matched_keywords,
       BOOL_OR(fd.domain_id IS NOT NULL) AS domain_match
FROM   team_problem_selection s
JOIN   problem_statement p    ON p.problem_id  = s.problem_id
JOIN   faculty f              ON f.is_available
LEFT JOIN problem_keyword pk  ON pk.problem_id = p.problem_id
LEFT JOIN faculty_keyword fk  ON fk.faculty_id = f.faculty_id
                             AND fk.keyword_id = pk.keyword_id
LEFT JOIN faculty_domain fd   ON fd.faculty_id = f.faculty_id
                             AND fd.domain_id  = p.domain_id
WHERE  s.team_id = 1
GROUP  BY f.faculty_id, f.full_name
ORDER  BY domain_match DESC, matched_keywords DESC;
### General benefits
| Benefit | MentorMatchr example |
| --- | --- |
| Data integrity | One authoritative faculty profile, so a mentor's expertise cannot contradict itself across rows |
| Consistency of matching | Faculty and problem keywords come from one vocabulary, so matches are not missed because of spelling |
| Less storage | A faculty member's 4 keywords are stored as 4 rows, not copied into every team row (and not 48 cross-product rows) |
| Simpler maintenance | Adding a domain, renaming a department or updating a keyword is a one-row change |
| Auditability | mentor_assignment keeps who assigned whom, when, with what score, and whether the assignment was later replaced |
| Scalability | New hackathon editions add rows, never columns. The same faculty profiles are reused across hackathons. |
## 10. Conclusion
MentorMatchr's data was taken from a single unnormalized team-centric record to a set of 15 implemented relations, each in BCNF:

| Stage | Key change for MentorMatchr |
| --- | --- |
| UNF → 1NF | Split combined cells (hackathon name/year, dates, department code/name). Moved problem keywords, faculty domains, faculty expertise and faculty keywords into their own relations. |
| 1NF → 2NF | Removed partial dependencies on the composite key (hackathon, team, faculty): hackathon, team/problem and faculty details became separate relations |
| 2NF → 3NF | Removed transitive dependencies: problem statement out of team, department out of faculty, coordinator out of assignment. Added shared domain, keyword and expertise master lists. |
| 3NF → BCNF | After surrogate keys were introduced, found problem_id → hackathon_id in the draft team relation (3NF but not BCNF). Decomposed it into team + team_problem_selection and kept the cross-table rule with triggers. |
Every candidate key in the final design is backed by a declared PRIMARY KEY or UNIQUE constraint. Every functional dependency used in the analysis is either declared or listed as an explicit business rule (Section 1.2). Two results depend on stated assumptions rather than declarations: hackathon relies on rule A1 (edition year is not derived from start date), and mentor_assignment relies on rule A4 (match score is a recorded snapshot). If either assumption changes, the affected table must be re-analysed. The rules the schema does not enforce (Section 7.8), such as mentor capacity and availability, are listed so they can be handled in the application or by future triggers.