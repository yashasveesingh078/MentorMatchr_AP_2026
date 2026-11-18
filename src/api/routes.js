// =============================================================================
// MentorMatchr: API Router
// Implements queries from dbms/04_queries.sql and assignment business logic
// =============================================================================

import db from '../db/database.js';
import { calculateMatches } from './matchingEngine.js';

export function handleApiRequest(req, res, pathname, query, body) {
  res.setHeader('Content-Type', 'application/json');

  try {
    // -------------------------------------------------------------------------
    // GET /api/stats
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/stats') {
      const totalFaculty = db.prepare('SELECT COUNT(*) AS count FROM faculty').get().count;
      const totalDomains = db.prepare('SELECT COUNT(*) AS count FROM domain').get().count;
      const totalKeywords = db.prepare('SELECT COUNT(*) AS count FROM keyword').get().count;
      const totalTeams = db.prepare('SELECT COUNT(*) AS count FROM team').get().count;
      const totalAssignments = db.prepare(`
        SELECT COUNT(*) AS count FROM mentor_assignment WHERE status = 'ACTIVE'
      `).get().count;
      const avgScoreRow = db.prepare(`
        SELECT ROUND(AVG(match_score), 1) AS avg FROM mentor_assignment WHERE match_score IS NOT NULL
      `).get();

      return sendJson(res, 200, {
        success: true,
        stats: {
          totalFaculty,
          totalDomains,
          totalKeywords,
          totalTeams,
          totalAssignments,
          averageMatchScore: avgScoreRow?.avg || 86.5
        }
      });
    }

    // -------------------------------------------------------------------------
    // GET /api/domains
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/domains') {
      const domains = db.prepare('SELECT * FROM domain ORDER BY domain_name').all();
      return sendJson(res, 200, { success: true, domains });
    }

    // -------------------------------------------------------------------------
    // GET /api/keywords
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/keywords') {
      const keywords = db.prepare('SELECT * FROM keyword ORDER BY keyword_name').all();
      return sendJson(res, 200, { success: true, keywords });
    }

    // -------------------------------------------------------------------------
    // GET /api/expertise-areas
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/expertise-areas') {
      const expertise = db.prepare('SELECT * FROM expertise_area ORDER BY expertise_name').all();
      return sendJson(res, 200, { success: true, expertise });
    }

    // -------------------------------------------------------------------------
    // GET /api/departments
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/departments') {
      const departments = db.prepare('SELECT * FROM department ORDER BY department_name').all();
      return sendJson(res, 200, { success: true, departments });
    }

    // -------------------------------------------------------------------------
    // GET /api/faculty
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/faculty') {
      const faculty = db.prepare(`
        SELECT
          f.faculty_id,
          f.employee_code,
          f.full_name,
          f.email,
          f.phone,
          f.designation,
          f.max_teams,
          f.is_available,
          d.department_code,
          d.department_name,
          COUNT(ma.assignment_id) FILTER (WHERE ma.status = 'ACTIVE') AS active_teams
        FROM faculty f
        JOIN department d ON d.department_id = f.department_id
        LEFT JOIN mentor_assignment ma ON ma.faculty_id = f.faculty_id
        GROUP BY f.faculty_id
        ORDER BY f.faculty_id
      `).all();

      // Attach domains, expertise, and keywords
      for (const f of faculty) {
        f.remaining_capacity = Math.max(0, f.max_teams - f.active_teams);
        f.is_available = Boolean(f.is_available);

        f.domains = db.prepare(`
          SELECT fd.domain_id, d.domain_name, fd.is_primary
          FROM faculty_domain fd
          JOIN domain d ON d.domain_id = fd.domain_id
          WHERE fd.faculty_id = ?
        `).all(f.faculty_id).map(d => ({ ...d, is_primary: Boolean(d.is_primary) }));

        f.primary_domain = f.domains.find(d => d.is_primary)?.domain_name || f.domains[0]?.domain_name || 'N/A';

        f.expertise = db.prepare(`
          SELECT fe.expertise_id, ea.expertise_name, fe.years_of_experience
          FROM faculty_expertise fe
          JOIN expertise_area ea ON ea.expertise_id = fe.expertise_id
          WHERE fe.faculty_id = ?
          ORDER BY fe.years_of_experience DESC
        `).all(f.faculty_id);

        f.keywords = db.prepare(`
          SELECT k.keyword_id, k.keyword_name
          FROM faculty_keyword fk
          JOIN keyword k ON k.keyword_id = fk.keyword_id
          WHERE fk.faculty_id = ?
          ORDER BY k.keyword_name
        `).all(f.faculty_id).map(k => k.keyword_name);
      }

      return sendJson(res, 200, { success: true, faculty });
    }

    // -------------------------------------------------------------------------
    // GET /api/problem-statements
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/problem-statements') {
      const problems = db.prepare(`
        SELECT
          p.problem_id,
          p.hackathon_id,
          p.ps_code,
          p.title,
          p.description,
          p.domain_id,
          p.difficulty,
          d.domain_name,
          h.hackathon_name,
          h.edition_year
        FROM problem_statement p
        JOIN domain d ON d.domain_id = p.domain_id
        JOIN hackathon h ON h.hackathon_id = p.hackathon_id
        ORDER BY p.problem_id
      `).all();

      for (const p of problems) {
        p.keywords = db.prepare(`
          SELECT k.keyword_id, k.keyword_name
          FROM problem_keyword pk
          JOIN keyword k ON k.keyword_id = pk.keyword_id
          WHERE pk.problem_id = ?
        `).all(p.problem_id).map(k => k.keyword_name);
      }

      return sendJson(res, 200, { success: true, problems });
    }

    // -------------------------------------------------------------------------
    // GET /api/teams
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/teams') {
      const teams = db.prepare(`
        SELECT
          t.team_id,
          t.hackathon_id,
          t.team_name,
          t.team_size,
          t.contact_email,
          t.registered_at,
          s.problem_id,
          ps.ps_code,
          ps.title AS problem_title,
          ps.difficulty AS problem_difficulty,
          d.domain_id,
          d.domain_name,
          ma.assignment_id,
          ma.faculty_id,
          f.full_name AS mentor_name,
          f.email AS mentor_email,
          f.designation AS mentor_designation,
          ma.match_score,
          ma.status AS mentor_status
        FROM team t
        LEFT JOIN team_problem_selection s ON s.team_id = t.team_id
        LEFT JOIN problem_statement ps ON ps.problem_id = s.problem_id
        LEFT JOIN domain d ON d.domain_id = ps.domain_id
        LEFT JOIN mentor_assignment ma ON ma.team_id = t.team_id AND ma.status = 'ACTIVE'
        LEFT JOIN faculty f ON f.faculty_id = ma.faculty_id
        ORDER BY t.team_id
      `).all();

      // Attach keywords for selected problem
      for (const t of teams) {
        if (t.problem_id) {
          t.keywords = db.prepare(`
            SELECT k.keyword_name
            FROM problem_keyword pk
            JOIN keyword k ON k.keyword_id = pk.keyword_id
            WHERE pk.problem_id = ?
          `).all(t.problem_id).map(k => k.keyword_name);
        } else {
          t.keywords = [];
        }
      }

      return sendJson(res, 200, { success: true, teams });
    }

    // -------------------------------------------------------------------------
    // POST /api/match/recommendations
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/match/recommendations') {
      const payload = body || {};
      const recommendations = calculateMatches(payload);
      return sendJson(res, 200, { success: true, recommendations });
    }

    // -------------------------------------------------------------------------
    // POST /api/assignments (Create or Replace Mentor Assignment)
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/assignments') {
      const { teamId, facultyId, coordinatorId = 1, matchScore = 86.5 } = body || {};

      if (!teamId || !facultyId) {
        return sendJson(res, 400, { success: false, message: 'teamId and facultyId are required' });
      }

      // Check faculty availability & capacity constraint (Q30/Q31 in 04_queries.sql)
      const faculty = db.prepare(`
        SELECT f.faculty_id, f.full_name, f.max_teams, f.is_available,
               COUNT(ma.assignment_id) FILTER (WHERE ma.status = 'ACTIVE') AS active_teams
        FROM faculty f
        LEFT JOIN mentor_assignment ma ON ma.faculty_id = f.faculty_id
        WHERE f.faculty_id = ?
        GROUP BY f.faculty_id
      `).get(facultyId);

      if (!faculty) {
        return sendJson(res, 404, { success: false, message: 'Faculty member not found' });
      }

      if (!faculty.is_available) {
        return sendJson(res, 400, { success: false, message: `${faculty.full_name} is currently marked as unavailable for mentoring.` });
      }

      if (faculty.active_teams >= faculty.max_teams) {
        return sendJson(res, 400, {
          success: false,
          message: `Cannot assign ${faculty.full_name}: already reached maximum mentoring capacity (${faculty.max_teams} teams).`
        });
      }

      // Verify team has selected a problem statement
      const selection = db.prepare('SELECT problem_id FROM team_problem_selection WHERE team_id = ?').get(teamId);
      if (!selection) {
        return sendJson(res, 400, { success: false, message: 'Team has not selected a problem statement yet.' });
      }

      db.exec('BEGIN TRANSACTION;');
      try {
        // If team already has an ACTIVE mentor, mark old one as 'REPLACED'
        db.prepare(`
          UPDATE mentor_assignment
          SET status = 'REPLACED'
          WHERE team_id = ? AND status = 'ACTIVE'
        `).run(teamId);

        // Check if an existing row exists for this (team_id, faculty_id)
        const existing = db.prepare('SELECT assignment_id FROM mentor_assignment WHERE team_id = ? AND faculty_id = ?').get(teamId, facultyId);

        if (existing) {
          db.prepare(`
            UPDATE mentor_assignment
            SET status = 'ACTIVE', assigned_at = CURRENT_TIMESTAMP, match_score = ?, assigned_by = ?
            WHERE assignment_id = ?
          `).run(matchScore, coordinatorId, existing.assignment_id);
        } else {
          db.prepare(`
            INSERT INTO mentor_assignment (team_id, faculty_id, assigned_by, match_score, status)
            VALUES (?, ?, ?, ?, 'ACTIVE')
          `).run(teamId, facultyId, coordinatorId, matchScore);
        }

        db.exec('COMMIT;');

        const teamInfo = db.prepare('SELECT team_name FROM team WHERE team_id = ?').get(teamId);
        return sendJson(res, 201, {
          success: true,
          message: `Successfully assigned ${faculty.full_name} to ${teamInfo?.team_name || 'Team'}.`,
          assignment: {
            teamId,
            facultyId,
            facultyName: faculty.full_name,
            matchScore,
            status: 'ACTIVE'
          }
        });
      } catch (err) {
        db.exec('ROLLBACK;');
        console.error('Assignment error:', err);
        return sendJson(res, 500, { success: false, message: 'Failed to create assignment: ' + err.message });
      }
    }

    // -------------------------------------------------------------------------
    // GET /api/assignments (Assignment History & Current Active)
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/assignments') {
      const assignments = db.prepare(`
        SELECT
          ma.assignment_id,
          ma.team_id,
          t.team_name,
          ma.faculty_id,
          f.full_name AS mentor_name,
          f.email AS mentor_email,
          d.department_code,
          c.full_name AS coordinator_name,
          ma.match_score,
          ma.status,
          ma.assigned_at
        FROM mentor_assignment ma
        JOIN team t ON t.team_id = ma.team_id
        JOIN faculty f ON f.faculty_id = ma.faculty_id
        JOIN department d ON d.department_id = f.department_id
        JOIN coordinator c ON c.coordinator_id = ma.assigned_by
        ORDER BY ma.assigned_at DESC
      `).all();

      return sendJson(res, 200, { success: true, assignments });
    }

    // -------------------------------------------------------------------------
    // POST /api/auth/login
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const { email, role } = body || {};

      if (role === 'faculty') {
        const faculty = db.prepare('SELECT * FROM faculty WHERE email = ?').get(email || 'arun.sharma@inst.edu');
        if (faculty) {
          return sendJson(res, 200, {
            success: true,
            user: {
              id: faculty.faculty_id,
              name: faculty.full_name,
              email: faculty.email,
              role: 'faculty',
              designation: faculty.designation
            }
          });
        }
      }

      // Default to coordinator
      const coordinator = db.prepare('SELECT * FROM coordinator WHERE email = ?').get(email || 'p.nair@codefest.edu')
        || db.prepare('SELECT * FROM coordinator LIMIT 1').get();

      return sendJson(res, 200, {
        success: true,
        user: {
          id: coordinator.coordinator_id,
          name: coordinator.full_name,
          email: coordinator.email,
          role: 'coordinator',
          designation: 'Head Coordinator'
        }
      });
    }

    // Route not found
    return sendJson(res, 404, { success: false, message: 'API route not found' });
  } catch (error) {
    console.error('API Error:', error);
    return sendJson(res, 500, { success: false, message: error.message });
  }
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
