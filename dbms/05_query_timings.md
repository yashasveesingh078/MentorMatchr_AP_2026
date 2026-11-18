MentorMatchr — Query Plan Analysis
Expected EXPLAIN ANALYZE Plans
Important: The plans in this document are analytically derived from dbms/03_schema.sql and the query patterns in dbms/04_queries.sql. They have not been executed against the live MentorMatchr PostgreSQL database. Exact scan types, join order, costs, row estimates, actual rows, buffer counts and timings depend on the actual dataset, PostgreSQL version, statistics and configuration. The plan trees below show plausible plan shapes, not measured PostgreSQL output. Replace them with captured output after running the commands.

Q1 — Available Faculty by Department
Purpose: Retrieve available faculty members for one department, including their department details. This represents a common coordinator workflow when searching for potential mentors.

Tables involved: faculty, department

Indexes and constraints to inspect:
- idx_faculty_department — B-tree on faculty(department_id) → supports filtering faculty by department.
- faculty_pkey — primary-key index on faculty(faculty_id).
- department_pkey — primary-key index on department(department_id).
- department_code_key and department_name_key — unique indexes created by the corresponding UNIQUE constraints.
Expected scan type: For a selective department filter, an Index Scan or Bitmap Heap Scan on faculty using idx_faculty_department is plausible, followed by a primary-key lookup on department. For a small table or a department containing a large fraction of faculty, PostgreSQL may correctly choose a Sequential Scan.
EXPLAIN ANALYZE Command
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    f.faculty_id,
    f.employee_code,
    f.full_name,
    f.email,
    f.designation,
    d.department_code,
    d.department_name,
    f.max_teams
FROM faculty AS f
INNER JOIN department AS d
    ON d.department_id = f.department_id
WHERE f.department_id = 1
  AND f.is_available = TRUE
ORDER BY f.full_name;
Expected Plan Shape
Sort
  Sort Key: f.full_name
  -> Nested Loop
       -> Scan on faculty f
            Index Cond / Filter:
              department_id = 1
              is_available = true
       -> Index Scan using department_pkey on department d
            Index Cond: department_id = f.department_id
Interpretation
idx_faculty_department is the relevant supporting index for the department predicate. The is_available condition is not separately indexed in the supplied schema, so it may be applied as a filter after faculty rows for the department are found. The department join can use the department primary-key index. The ORDER BY f.full_name may require a Sort because the supplied schema does not define an index ordered by department and faculty name.

Do not assume an Index Scan will always be selected. If most rows belong to the requested department, PostgreSQL may prefer a Sequential Scan. Confirm the selected path and rows removed by filters in the real plan.
Q2 — Faculty Matching by Problem Domain
Purpose: Find available faculty members whose associated technical domain matches the domain assigned to a selected problem statement. Domain matching is one of the core operations in MentorMatchr.

Tables involved: problem_statement, faculty_domain, faculty

Indexes and constraints to inspect:
- problem_statement_pkey — primary-key index on problem_statement(problem_id).
- idx_problem_domain — B-tree on problem_statement(domain_id) → supports reverse lookup by domain.
- faculty_domain_pkey — composite B-tree on (faculty_id, domain_id) → supports faculty-first access.
- idx_faculty_domain_domain — B-tree on faculty_domain(domain_id) → supports domain-first access.
- faculty_pkey — primary-key index on faculty(faculty_id).
Expected scan type: An Index Scan on problem_statement_pkey for the selected problem, then an index-supported lookup into faculty_domain using the domain-leading index, followed by faculty primary-key lookups. A Hash Join or Nested Loop may be selected depending on the number of matching faculty rows.
EXPLAIN ANALYZE Command
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    f.faculty_id,
    f.full_name AS suggested_mentor,
    f.email,
    f.max_teams,
    d.domain_name
FROM problem_statement AS ps
INNER JOIN faculty_domain AS fd
    ON fd.domain_id = ps.domain_id
INNER JOIN faculty AS f
    ON f.faculty_id = fd.faculty_id
INNER JOIN domain AS d
    ON d.domain_id = ps.domain_id
WHERE ps.problem_id = 1
  AND f.is_available = TRUE
ORDER BY f.full_name;
Expected Plan Shape
Sort
  Sort Key: f.full_name
  -> Nested Loop
       -> Nested Loop
            -> Index Scan using problem_statement_pkey on problem_statement ps
                 Index Cond: problem_id = 1
            -> Index Scan / Bitmap Heap Scan on faculty_domain fd
                 Index Cond: domain_id = ps.domain_id
       -> Index Scan using faculty_pkey on faculty f
            Index Cond: faculty_id = fd.faculty_id
            Filter: is_available = true
       -> Index Scan using domain_pkey on domain d
            Index Cond: domain_id = ps.domain_id
Interpretation
The selected problem is identified through its primary key. The important reverse lookup is from problem_statement.domain_id to faculty_domain.domain_id; idx_faculty_domain_domain exists specifically to support this access direction. The composite primary key (faculty_id, domain_id) is faculty-first and is not a substitute for the reverse index when the lookup begins with domain_id.

The faculty primary key supports the join from matching faculty-domain rows to faculty profiles. Availability is checked on faculty; there is no standalone index on is_available in the supplied schema. Depending on cardinality, PostgreSQL may choose a Hash Join rather than the nested-loop shape shown above.
Q3 — Faculty and Problem Keyword Overlap
Purpose: Find available faculty members who share one or more technical keywords with a selected problem statement, and count the matching keywords per faculty member. This query measures the keyword-overlap portion of mentor matching.

Tables involved: problem_statement, problem_keyword, faculty_keyword, faculty, keyword

Indexes and constraints to inspect:
- problem_statement_pkey — primary-key index on problem_statement(problem_id).
- problem_keyword_pkey — composite B-tree on (problem_id, keyword_id) → supports problem-first keyword lookup.
- idx_problem_keyword_kw — B-tree on problem_keyword(keyword_id) → supports reverse keyword lookup.
- faculty_keyword_pkey — composite B-tree on (faculty_id, keyword_id) → supports faculty-first lookup.
- idx_faculty_keyword_kw — B-tree on faculty_keyword(keyword_id) → supports finding faculty by a keyword.
- faculty_pkey — primary-key index on faculty(faculty_id).
- keyword_pkey — primary-key index on keyword(keyword_id).
Expected scan type: An Index Scan on problem_statement_pkey, followed by a problem-first lookup in problem_keyword. Matching keyword IDs can then be joined to faculty_keyword using idx_faculty_keyword_kw. PostgreSQL may use Nested Loop joins for small keyword sets or Hash Joins for larger sets, followed by an Aggregate node.
EXPLAIN ANALYZE Command
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    f.faculty_id,
    f.full_name AS suggested_mentor,
    COUNT(DISTINCT fk.keyword_id) AS matched_keyword_count,
    STRING_AGG(DISTINCT k.keyword_name, ', ' ORDER BY k.keyword_name)
        AS matching_keywords
FROM problem_keyword AS pk
INNER JOIN faculty_keyword AS fk
    ON fk.keyword_id = pk.keyword_id
INNER JOIN faculty AS f
    ON f.faculty_id = fk.faculty_id
INNER JOIN keyword AS k
    ON k.keyword_id = pk.keyword_id
WHERE pk.problem_id = 1
  AND f.is_available = TRUE
GROUP BY f.faculty_id, f.full_name
ORDER BY matched_keyword_count DESC, f.full_name;
Expected Plan Shape
Sort
  Sort Key: count(DISTINCT fk.keyword_id) DESC, f.full_name
  -> GroupAggregate / HashAggregate
       Group Key: f.faculty_id, f.full_name
       -> Join
            -> Index Scan using problem_keyword_pkey on problem_keyword pk
                 Index Cond: problem_id = 1
            -> Index Scan / Bitmap Heap Scan on faculty_keyword fk
                 Index Cond: keyword_id = pk.keyword_id
            -> Index Scan using faculty_pkey on faculty f
                 Index Cond: faculty_id = fk.faculty_id
                 Filter: is_available = true
            -> Index Scan using keyword_pkey on keyword k
                 Index Cond: keyword_id = pk.keyword_id
Interpretation
The primary key on problem_keyword(problem_id, keyword_id) is suited to finding all keywords attached to one problem. The reverse index idx_faculty_keyword_kw is important because the query then searches faculty profiles by those keyword IDs. The faculty and keyword primary keys support profile/name lookups.

The aggregate counts distinct matching keyword IDs for each faculty member. PostgreSQL may select HashAggregate or GroupAggregate depending on row estimates, ordering requirements and available memory. The final ordering by the calculated count generally requires a Sort. Compare estimated rows with actual rows, particularly if some keywords are much more common than others.
Q4 — Team, Selected Problem and Hackathon Lookup
Purpose: Retrieve a team's hackathon and selected problem statement, if the team has selected one. This query supports coordinator review of team registrations and problem selections.

Tables involved: team, hackathon, team_problem_selection, problem_statement, domain

Indexes and constraints to inspect:
- team_pkey — primary-key index on team(team_id).
- hackathon_pkey — primary-key index on hackathon(hackathon_id).
- team_problem_selection_pkey — primary-key index on team_problem_selection(team_id); also enforces at most one selected problem per team.
- idx_selection_problem — B-tree on team_problem_selection(problem_id) → supports reverse lookup by selected problem.
- problem_statement_pkey — primary-key index on problem_statement(problem_id).
- domain_pkey — primary-key index on domain(domain_id).
Expected scan type: Index Scan on team_pkey for a single team, primary-key lookup on hackathon, and a lookup into team_problem_selection using its primary key. Because problem selection is optional in this query, PostgreSQL must preserve unmatched teams through a Left Join.
EXPLAIN ANALYZE Command
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    t.team_id,
    t.team_name,
    h.hackathon_name,
    h.edition_year,
    ps.problem_id,
    ps.ps_code,
    ps.title AS problem_title,
    d.domain_name,
    s.selected_at
FROM team AS t
INNER JOIN hackathon AS h
    ON h.hackathon_id = t.hackathon_id
LEFT JOIN team_problem_selection AS s
    ON s.team_id = t.team_id
LEFT JOIN problem_statement AS ps
    ON ps.problem_id = s.problem_id
LEFT JOIN domain AS d
    ON d.domain_id = ps.domain_id
WHERE t.team_id = 1;
Expected Plan Shape
Nested Loop Left Join
  -> Nested Loop Left Join
       -> Nested Loop
            -> Index Scan using team_pkey on team t
                 Index Cond: team_id = 1
            -> Index Scan using hackathon_pkey on hackathon h
                 Index Cond: hackathon_id = t.hackathon_id
       -> Index Scan using team_problem_selection_pkey on team_problem_selection s
            Index Cond: team_id = t.team_id
  -> Index Scan using problem_statement_pkey on problem_statement ps
       Index Cond: problem_id = s.problem_id
  -> Index Scan using domain_pkey on domain d
       Index Cond: domain_id = ps.domain_id
Interpretation
The team ID predicate is selective and can use the team primary-key index. The selection table's primary key is team_id, matching the lookup direction used by the query. The LEFT JOIN is intentional: teams without a selected problem must still appear in the result, with problem and domain columns set to NULL.

The foreign-key relationship from team to hackathon and the primary keys on problem statement and domain support the remaining joins. For a single team, nested-loop joins with indexed lookups are plausible. For a report covering many teams, PostgreSQL may instead choose hash-based joins or sequential scans.
Q5 — Integrated Mentor Ranking
Purpose: Produce a shortlist of potential mentors for a team's selected problem. The query combines domain matching, keyword overlap, faculty availability and remaining mentoring capacity. Candidates are ranked by domain match, keyword overlap, remaining capacity and name.

Tables involved: team, team_problem_selection, problem_statement, problem_keyword, faculty_keyword, faculty_domain, faculty, mentor_assignment

Indexes and constraints to inspect:
- team_pkey — identifies the requested team.
- team_problem_selection_pkey — retrieves that team's selected problem.
- problem_statement_pkey — retrieves the selected problem's domain.
- problem_keyword_pkey — finds keywords attached to the selected problem.
- idx_faculty_keyword_kw — finds faculty members by matching keyword.
- faculty_keyword_pkey — supports faculty-first keyword lookups.
- idx_faculty_domain_domain — supports domain-first faculty matching.
- faculty_domain_pkey — supports faculty/domain pair lookups.
- mentor_assignment has uq_assignment_team_faculty on (team_id, faculty_id) and the partial unique index uq_team_one_active_mentor on team_id for rows where status = 'ACTIVE'.
- idx_assignment_faculty — B-tree on mentor_assignment(faculty_id); useful for faculty assignment lookups.
Expected scan type: The target team and selected problem can be found through primary-key lookups. Keyword matching can use the problem-first primary key and reverse faculty-keyword index. Domain matching can use idx_faculty_domain_domain. Active assignment counts require aggregation over mentor_assignment; the planner may choose a sequential scan and aggregate when a substantial portion of assignment rows is needed.
EXPLAIN ANALYZE Command
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
WITH target_problem AS (
    SELECT
        t.team_id,
        ps.problem_id,
        ps.domain_id
    FROM team AS t
    INNER JOIN team_problem_selection AS s
        ON s.team_id = t.team_id
    INNER JOIN problem_statement AS ps
        ON ps.problem_id = s.problem_id
    WHERE t.team_id = 1
),
active_load AS (
    SELECT
        ma.faculty_id,
        COUNT(*) FILTER (WHERE ma.status = 'ACTIVE') AS active_teams
    FROM mentor_assignment AS ma
    GROUP BY ma.faculty_id
),
keyword_matches AS (
    SELECT
        fk.faculty_id,
        COUNT(DISTINCT fk.keyword_id) AS matched_keywords
    FROM target_problem AS tp
    INNER JOIN problem_keyword AS pk
        ON pk.problem_id = tp.problem_id
    INNER JOIN faculty_keyword AS fk
        ON fk.keyword_id = pk.keyword_id
    GROUP BY fk.faculty_id
)
SELECT
    f.faculty_id,
    f.full_name AS suggested_mentor,
    f.email,
    (fd.faculty_id IS NOT NULL) AS domain_match,
    COALESCE(km.matched_keywords, 0) AS matched_keywords,
    f.max_teams,
    COALESCE(al.active_teams, 0) AS active_teams,
    f.max_teams - COALESCE(al.active_teams, 0) AS remaining_capacity
FROM target_problem AS tp
CROSS JOIN faculty AS f
LEFT JOIN faculty_domain AS fd
    ON fd.faculty_id = f.faculty_id
   AND fd.domain_id = tp.domain_id
LEFT JOIN keyword_matches AS km
    ON km.faculty_id = f.faculty_id
LEFT JOIN active_load AS al
    ON al.faculty_id = f.faculty_id
WHERE f.is_available = TRUE
  AND f.max_teams > COALESCE(al.active_teams, 0)
  AND NOT EXISTS (
      SELECT 1
      FROM mentor_assignment AS existing
      WHERE existing.team_id = tp.team_id
        AND existing.faculty_id = f.faculty_id
  )
ORDER BY
    (fd.faculty_id IS NOT NULL) DESC,
    COALESCE(km.matched_keywords, 0) DESC,
    (f.max_teams - COALESCE(al.active_teams, 0)) DESC,
    f.full_name;
Expected Plan Shape
Sort
  Sort Key:
    domain_match DESC,
    matched_keywords DESC,
    remaining_capacity DESC,
    f.full_name
  -> Nested Loop / Hash Left Join
       -> Nested Loop
            -> Index Scan using team_pkey on team
                 Index Cond: team_id = 1
            -> Index Scan using team_problem_selection_pkey
                 Index Cond: team_id = team.team_id
            -> Index Scan using problem_statement_pkey
                 Index Cond: problem_id = selection.problem_id
       -> Scan on faculty f
            Filter: is_available AND max_teams > active_teams
       -> Join to faculty_domain fd
            Index Cond / Join Cond: faculty_id and domain_id
       -> Join to keyword_matches km
            Aggregate matching problem/faculty keyword rows
       -> Join to active_load al
            Aggregate ACTIVE mentor_assignment rows by faculty_id
       -> Anti Join / NOT EXISTS
            Check team_id and faculty_id against mentor_assignment
Interpretation
This is the most representative performance workload because it combines the platform's main matching dimensions. The selected problem is first resolved for the team. Domain and keyword relationships are then compared with faculty profiles, while active assignments are aggregated to calculate remaining capacity.

The schema's reverse indexes on faculty_domain(domain_id) and faculty_keyword(keyword_id) support domain-first and keyword-first matching. However, the active-load CTE groups assignment records by faculty, so the amount of data in mentor_assignment and the proportion of active rows can materially affect the plan. PostgreSQL may scan and aggregate the assignment table rather than use an index for every faculty member.

Important correctness limitation: The schema does not declaratively enforce that a faculty member is available, has remaining capacity, or that a team has selected a problem before an assignment is inserted. This query creates a shortlist only. The assignment operation must re-check these conditions transactionally to prevent concurrent over-allocation. The unique constraints still enforce no duplicate team/faculty pair and at most one ACTIVE mentor per team.

The query's CROSS JOIN faculty is intentional for a complete candidate list, but can create a large intermediate candidate set. If performance becomes poor on realistic data, compare this version with a candidate-first query that derives domain/keyword matches first and then adds eligible faculty. Do not rewrite it without measuring and verifying that the candidate semantics remain the same.
Q6 — Complete Mentor Assignment History
Purpose: Retrieve all mentor assignments for a selected team, including ACTIVE, REPLACED and WITHDRAWN records, along with faculty and coordinator details. This supports audit and assignment-history views.

Tables involved: mentor_assignment, team, faculty, coordinator

Indexes and constraints to inspect:
- mentor_assignment_pkey — primary-key index on assignment_id.
- uq_assignment_team_faculty — unique B-tree on (team_id, faculty_id); its leading team_id column supports lookup of a team's assignment rows.
- uq_team_one_active_mentor — partial unique index on team_id where status = 'ACTIVE'; only ACTIVE rows are included.
- idx_assignment_faculty — B-tree on faculty_id.
- idx_assignment_coordinator — B-tree on assigned_by.
- team_pkey, faculty_pkey, coordinator_pkey — primary-key indexes for related records.
Expected scan type: An index-supported lookup into mentor_assignment by team_id is plausible through the unique (team_id, faculty_id) index. The partial active-only index cannot by itself provide the complete history because REPLACED and WITHDRAWN rows are excluded. Joins to team, faculty and coordinator can use primary-key indexes.
EXPLAIN ANALYZE Command
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    t.team_id,
    t.team_name,
    f.faculty_id,
    f.full_name AS mentor_name,
    ma.status,
    ma.assigned_at,
    ma.match_score,
    c.coordinator_id,
    c.full_name AS assigned_by
FROM mentor_assignment AS ma
INNER JOIN team AS t
    ON t.team_id = ma.team_id
INNER JOIN faculty AS f
    ON f.faculty_id = ma.faculty_id
INNER JOIN coordinator AS c
    ON c.coordinator_id = ma.assigned_by
WHERE ma.team_id = 1
ORDER BY ma.assigned_at DESC, ma.assignment_id DESC;
Expected Plan Shape
Sort
  Sort Key: ma.assigned_at DESC, ma.assignment_id DESC
  -> Nested Loop
       -> Nested Loop
            -> Nested Loop
                 -> Index Scan using uq_assignment_team_faculty
                      on mentor_assignment ma
                      Index Cond: team_id = 1
                 -> Index Scan using team_pkey on team t
                      Index Cond: team_id = ma.team_id
            -> Index Scan using faculty_pkey on faculty f
                 Index Cond: faculty_id = ma.faculty_id
       -> Index Scan using coordinator_pkey on coordinator c
            Index Cond: coordinator_id = ma.assigned_by
Interpretation
The unique index on (team_id, faculty_id) begins with team_id, so it can support the history lookup for a specific team. The partial index uq_team_one_active_mentor only contains ACTIVE assignment rows and must not be treated as the access path for the complete history, because this query also returns REPLACED and WITHDRAWN records.

The related team, faculty and coordinator records can be retrieved through their primary-key indexes. The schema does not define an index on mentor_assignment(assigned_at), so the requested descending history order may require a Sort. If this query is frequent and the measured sort cost is material, evaluate a composite index beginning with (team_id, assigned_at DESC) in a separate experiment. Consider the write and storage overhead before retaining it.
Index Summary
Query	Main supporting index / constraint	Index type	Expected use
Q1 Available Faculty by Department	idx_faculty_department	B-tree	Department filter
Q2 Domain Matching	idx_faculty_domain_domain, idx_problem_domain	B-tree	Domain-first matching
Q3 Keyword Overlap	idx_faculty_keyword_kw, problem_keyword_pkey	B-tree	Problem-first and keyword-first lookup
Q4 Team Problem Lookup	team_problem_selection_pkey	B-tree PK	Team selection lookup
Q5 Integrated Mentor Ranking	idx_faculty_domain_domain, idx_faculty_keyword_kw, problem_keyword_pkey, assignment indexes	B-tree	Domain/keyword matching and assignment checks
Q6 Assignment History	uq_assignment_team_faculty	B-tree UNIQUE	Team assignment history lookup


Benchmark and Validation Notes
1. Run the commands against the actual PostgreSQL database after loading representative data.
2. Replace the illustrative IDs (1) with IDs that exist in the database.
3. Run ANALYZE; after loading or substantially changing benchmark data so planner statistics are current.
4. Save the complete output, including Planning Time, Execution Time and buffer details, in dbms/plans/results/.
5. Repeat each query under consistent conditions and report the median execution time in this report only after measuring it.
6. Do not copy illustrative plan shapes into the results directory as if they were captured output.
7. A Sequential Scan is not automatically a problem. PostgreSQL may choose it when a table is small or a predicate is not selective.
8. Do not claim an index improves performance until a comparable before/after measurement supports that conclusion.
Conclusion
The MentorMatchr schema contains indexes for department filtering, reverse domain and keyword matching, selected-problem lookup and assignment-related access. The six workloads in this report cover the principal database operations involved in faculty search, problem matching, team selection, mentor ranking and assignment auditing.

The plan descriptions are expectations derived from the schema and SQL, not measured results. Final conclusions must be based on execution plans and timings captured from the actual database and representative dataset.
