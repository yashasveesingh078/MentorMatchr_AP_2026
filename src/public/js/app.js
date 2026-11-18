// =============================================================================
// MentorMatchr: Main Application Coordinator
// =============================================================================

import { initRouter } from './router.js';
import { initAuth, getCurrentUser } from './auth.js';
import { initSimulator } from './simulator.js';
import { initFilterWorkspace, triggerFilterSearch } from './filter.js';
import { initStudentModal } from './student.js';
import { initFacultyModal } from './faculty.js';

let cachedTeams = [];

document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initAuth();
  initSimulator();
  initFilterWorkspace();
  initStudentModal();
  initFacultyModal();
  initCoordinatorTabs();
  loadStats();
  loadTeams();
  loadAuditHistory();
  initAssignModal();
});

function initCoordinatorTabs() {
  const tabs = document.querySelectorAll('#coordinatorSubnavTabs .subnav-tab-btn');
  const matrixSection = document.getElementById('coordSectionMatrix');
  const teamsSection = document.getElementById('coordSectionTeams');
  const auditSection = document.getElementById('coordSectionAudit');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-tab');

      const animateEl = (el) => {
        if (!el) return;
        el.classList.remove('tab-pane-transition');
        void el.offsetWidth;
        el.classList.add('tab-pane-transition');
      };

      if (target === 'all') {
        if (matrixSection) { matrixSection.style.display = 'block'; animateEl(matrixSection); }
        if (teamsSection) { teamsSection.style.display = 'block'; animateEl(teamsSection); }
        if (auditSection) { auditSection.style.display = 'block'; animateEl(auditSection); }
      } else if (target === 'matrix') {
        if (matrixSection) { matrixSection.style.display = 'block'; animateEl(matrixSection); }
        if (teamsSection) { teamsSection.style.display = 'none'; }
        if (auditSection) { auditSection.style.display = 'none'; }
      } else if (target === 'teams') {
        if (matrixSection) { matrixSection.style.display = 'none'; }
        if (teamsSection) { teamsSection.style.display = 'block'; animateEl(teamsSection); }
        if (auditSection) { auditSection.style.display = 'none'; }
      } else if (target === 'audit') {
        if (matrixSection) { matrixSection.style.display = 'none'; }
        if (teamsSection) { teamsSection.style.display = 'none'; }
        if (auditSection) { auditSection.style.display = 'block'; animateEl(auditSection); }
      }
    });
  });
}

// Toast notification helper
window.showToast = function(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>&#10003;</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
};

// Global refresh callback
window.refreshTeamsAndStats = function() {
  loadStats();
  loadTeams();
  loadAuditHistory();
  triggerFilterSearch();
};

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const el = document.getElementById('statDomains');
      if (el) el.textContent = `${data.stats.totalDomains}+`;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadTeams() {
  const tbody = document.getElementById('teamsTableBody');
  try {
    const res = await fetch('/api/teams');
    const data = await res.json();
    if (data.success) {
      cachedTeams = data.teams || [];
      renderTeamsTable(cachedTeams);
      populateAssignTeamDropdown(cachedTeams);
    }
  } catch (err) {
    console.error('Error loading teams:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Failed to load teams data.</td></tr>';
  }
}

function renderTeamsTable(teams) {
  const tbody = document.getElementById('teamsTableBody');
  if (teams.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-tertiary);">No teams registered.</td></tr>';
    return;
  }

  tbody.innerHTML = teams.map(t => {
    const hasMentor = Boolean(t.faculty_id);
    const mentorDisplay = hasMentor
      ? `<strong>${t.mentor_name}</strong><br><span style="font-size: 11.5px; color: var(--text-secondary);">${t.mentor_designation}</span>`
      : '<span style="color: var(--text-tertiary); font-style: italic;">Unallocated</span>';

    const scoreDisplay = hasMentor && t.match_score
      ? `<span style="font-weight: 700; color: var(--text-primary);">${t.match_score}%</span>`
      : '<span style="color: var(--text-tertiary);">-</span>';

    const statusBadge = hasMentor
      ? `<span class="status-pill-active">&#9679; ACTIVE</span>`
      : `<span class="status-pill-replaced">PENDING</span>`;

    return `
      <tr>
        <td style="font-weight: 600;">${t.team_name}</td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary);">${t.ps_code}: ${t.problem_title}</div>
          <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">
            ${t.keywords.map(k => `#${k}`).join(' ')}
          </div>
        </td>
        <td>
          <span style="font-size: 12px; font-weight: 500;">${t.domain_name}</span><br>
          <span style="font-size: 11px; color: var(--text-tertiary);">${t.problem_difficulty}</span>
        </td>
        <td>${mentorDisplay}</td>
        <td>${scoreDisplay}</td>
        <td>${statusBadge}</td>
        <td>
          <button
            class="btn-nav-action"
            style="font-size: 11.5px; padding: 4px 10px;"
            onclick="quickMatchForTeam(${t.team_id}, '${escapeHtml(t.domain_name)}', '${escapeHtml(t.keywords.join(','))}')"
          >
            ${hasMentor ? 'Change Mentor' : 'Find Mentor &rarr;'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function populateAssignTeamDropdown(teams) {
  const select = document.getElementById('assignTeamSelect');
  select.innerHTML = '<option value="">-- Choose a Team --</option>';
  teams.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.team_id;
    opt.textContent = `${t.team_name} (${t.ps_code} - ${t.domain_name})`;
    select.appendChild(opt);
  });
}

async function loadAuditHistory() {
  const container = document.getElementById('assignmentAuditList');
  try {
    const res = await fetch('/api/assignments');
    const data = await res.json();
    if (data.success && data.assignments) {
      if (data.assignments.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: var(--text-tertiary);">No assignment history recorded yet.</div>';
        return;
      }

      container.innerHTML = data.assignments.slice(0, 5).map(a => {
        const dateStr = new Date(a.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
        const isAct = a.status === 'ACTIVE';

        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #FAF8F5; border: 1px solid var(--border-light); border-radius: 8px;">
            <div>
              <span style="font-weight: 600; color: var(--text-primary);">${a.team_name}</span>
              <span style="color: var(--text-tertiary); margin: 0 6px;">&rarr;</span>
              <span style="font-weight: 600; color: var(--text-primary);">${a.mentor_name}</span>
              <span style="font-size: 11.5px; color: var(--text-secondary); margin-left: 6px;">(${a.department_code})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${a.match_score ? a.match_score + '%' : ''}</span>
              <span class="${isAct ? 'status-pill-active' : 'status-pill-replaced'}">${a.status}</span>
              <span style="font-size: 11px; color: var(--text-tertiary);">${dateStr}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading audit history:', err);
  }
}

// Assign Modal Logic
function initAssignModal() {
  const modal = document.getElementById('assignModal');
  const closeBtn = document.getElementById('closeAssignModal');
  const form = document.getElementById('assignForm');
  const teamSelect = document.getElementById('assignTeamSelect');
  const previewBox = document.getElementById('assignTeamProblemPreview');

  closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  teamSelect.addEventListener('change', () => {
    const tId = Number(teamSelect.value);
    const team = cachedTeams.find(t => t.team_id === tId);
    if (team) {
      previewBox.innerHTML = `
        <div style="font-weight: 600; color: var(--text-primary);">${team.ps_code}: ${team.problem_title}</div>
        <div style="color: var(--text-secondary); margin-top: 4px;">Domain: <strong>${team.domain_name}</strong> &bull; Difficulty: ${team.problem_difficulty}</div>
        <div style="margin-top: 4px; color: var(--text-tertiary); font-size: 12px;">Required tags: ${team.keywords.map(k => '#' + k).join(' ')}</div>
      `;
    } else {
      previewBox.innerHTML = '<span style="color: var(--text-tertiary);">Select a team to preview problem statement details.</span>';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const facultyId = Number(document.getElementById('assignFacultyId').value);
    const teamId = Number(teamSelect.value);
    const score = Number(document.getElementById('assignScore').value) || 86.5;
    const user = getCurrentUser();

    if (!teamId) {
      alert('Please select a team');
      return;
    }

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          facultyId,
          coordinatorId: user ? user.id : 1,
          matchScore: score
        })
      });

      const data = await res.json();
      if (data.success) {
        modal.classList.remove('open');
        window.showToast(data.message);
        window.refreshTeamsAndStats();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error('Assignment error:', err);
      alert('An error occurred while creating the assignment.');
    }
  });
}

window.openAssignModal = function(facultyId, facultyName, score) {
  document.getElementById('assignFacultyId').value = facultyId;
  document.getElementById('assignScore').value = score;
  document.getElementById('assignModalDesc').textContent = `Assign ${facultyName} (${score}% match) to a hackathon team.`;
  document.getElementById('assignTeamProblemPreview').innerHTML = '<span style="color: var(--text-tertiary);">Select a team to preview problem statement details.</span>';
  document.getElementById('assignModal').classList.add('open');
};

window.quickMatchForTeam = function(teamId, domainName, keywordsStr) {
  // Jump to workspace filter with team parameters pre-filled
  const domainSelect = document.getElementById('domainSelect');
  const keywordInput = document.getElementById('keywordInput');

  for (let i = 0; i < domainSelect.options.length; i++) {
    if (domainSelect.options[i].text === domainName) {
      domainSelect.selectedIndex = i;
      break;
    }
  }

  keywordInput.value = keywordsStr.split(',').join(', ');
  keywordInput.dispatchEvent(new Event('input'));

  document.getElementById('workspace').scrollIntoView({ behavior: 'smooth' });
};

function initNavLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
