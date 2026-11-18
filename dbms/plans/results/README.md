# Captured execution-plan results

Save the complete output of each plan script here, for example:

- `01_faculty_department_search.txt`
- `02_domain_matching.txt`
- `03_keyword_matching.txt`
- `04_team_problem_selection.txt`
- `05_integrated_mentor_ranking.txt`
- `06_assignment_history.txt`

These files are intentionally not populated with sample or invented plans.
Generate them by running the SQL against your own PostgreSQL database.

Example from the repository root:

```bash
psql -X -v ON_ERROR_STOP=1 -d mentormatchr \
  -f dbms/plans/01_faculty_department_search.sql \
  > dbms/plans/results/01_faculty_department_search.txt 2>&1
```

Record the dataset profile, parameter IDs, PostgreSQL version and date/time
alongside the plans. The corresponding timings belong in `dbms/05_query_timings.md`.
