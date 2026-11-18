# MentorMatchr — PostgreSQL execution plans

This folder contains reproducible `EXPLAIN ANALYZE` workloads for the schema in
`dbms/03_schema.sql`.

## Files

| File | Workload |
|---|---|
| `01_faculty_department_search.sql` | Faculty search by department and availability |
| `02_domain_matching.sql` | Faculty whose domain matches a problem's domain |
| `03_keyword_matching.sql` | Faculty/problem keyword overlap |
| `04_team_problem_selection.sql` | Team, selected problem and hackathon lookup |
| `05_integrated_mentor_ranking.sql` | Domain + keyword + availability + remaining capacity |
| `06_assignment_history.sql` | Full assignment history for one team |
| `results/README.md` | How to save real plan output |

Each script is standalone and uses psql variables at the top. Replace the sample
IDs with IDs that exist in your loaded database.

## Prerequisites

1. Create/use a dedicated development database.
2. Run `dbms/03_schema.sql` and load representative, referentially valid data.
3. Run `ANALYZE;` after data loading.
4. Confirm the selected parameter IDs exist.
5. Do not run the schema reset script on a database whose data must be preserved.

## Run a plan

From the repository root:

```bash
psql -X -v ON_ERROR_STOP=1 -d mentormatchr -f dbms/plans/01_faculty_department_search.sql
```

Repeat for each script. For repeatable plan capture, save terminal output:

```bash
mkdir -p dbms/plans/results
psql -X -v ON_ERROR_STOP=1 -d mentormatchr \
  -f dbms/plans/01_faculty_department_search.sql \
  > dbms/plans/results/01_faculty_department_search.txt 2>&1
```

For a query requiring a different parameter, edit the `\\set` value at the top
of its script or pass a psql variable only if the script has been written to use
that variable. The supplied scripts define their own `\\set` values for clarity.

## Plan options

The scripts use:

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, SUMMARY, FORMAT TEXT)
SELECT ...;
```

`ANALYZE` executes the SELECT. These supplied statements are read-only. Capture
the full output; do not copy only the final execution-time line.

## Fair measurement rules

- Run one warm-up, then at least five measured repetitions.
- Record every execution time and report the median.
- Keep dataset, configuration and cache condition consistent.
- Run `ANALYZE` after loading data or changing indexes.
- Do not force index scans for the main results.
- A sequential scan can be the correct plan for a small or low-selectivity table.
- Do not claim before/after improvement until both variants have been measured.

See `dbms/05_query_timings.md` for the report template and interpretation guide.
