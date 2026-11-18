// =============================================================================
// MentorMatchr: Student & Team Portal Controller
// Tailored for student hackathon teams: problem tracking, mentor guidance & review
// =============================================================================

let currentTeamId = 1;
let currentAssignedMentorId = null;

export async function loadStudentPortal(teamId = 1) {
  currentTeamId = teamId;
  const container = document.getElementById('studentPortalContent');
  if (!container) return;

  container.innerHTML = '<div style="padding: 40px; color: var(--text-tertiary); font-size: 14px;">Loading team workspace...</div>';

  try {
    const res = await fetch(`/api/student/dashboard?teamId=${teamId}`);
    const data = await res.json();
    if (!data.success) {
      container.innerHTML = `<div style="color: red; padding: 20px;">${data.message}</div>`;
      return;
    }

    const { team, problem, assignment, requests } = data.data;
    currentAssignedMentorId = assignment?.faculty_id || null;

    renderStudentView(team, problem, assignment, requests);
  } catch (err) {
    console.error('Error loading student dashboard:', err);
    container.innerHTML = '<div style="color: red; padding: 20px;">Failed to load team data.</div>';
  }
}

function renderStudentView(team, problem, assignment, requests) {
  const container = document.getElementById('studentPortalContent');

  // Header Banner
  const headerHtml = `
    <div class="portal-page-header">
      <div class="container portal-header-inner">
        <div class="portal-title-block">
          <div class="hero-tag-pill" style="margin-bottom: 12px;">
            <span class="hero-tag-dot"></span>
            <span>Student Team Workspace &bull; CodeFest 2026</span>
          </div>
          <h1>Team <em>${team.team_name}</em></h1>
          <p>
            Track your challenge requirements, collaborate with your assigned faculty mentor, and request milestone review sessions.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="sim-capacity-badge" style="font-size: 12px; padding: 6px 12px;">
            ${team.team_size} Team Members
          </div>
          <button class="btn-primary" onclick="openRequestGuidanceModal()">
            Request Mentor Review &rarr;
          </button>
        </div>
      </div>
    </div>
  `;

  // In-Page Segmented Tab Strip (Keeps Top Navbar Royal & Uncluttered)
  const subnavHtml = `
    <div class="portal-subnav-strip">
      <div class="container subnav-tabs-container">
        <div class="subnav-tabs" id="studentSubnavTabs">
          <button class="subnav-tab-btn active" data-tab="all">
            <span class="subnav-tab-dot"></span>
            <span>Workspace Overview</span>
          </button>
          <button class="subnav-tab-btn" data-tab="problem">
            <span>Problem Statement</span>
            <span class="tab-tag">${problem ? problem.ps_code : 'PS-04'}</span>
          </button>
          <button class="subnav-tab-btn" data-tab="mentor">
            <span>Assigned Mentor</span>
            ${assignment ? `<span class="tab-tag sage">${assignment.match_score}% Match</span>` : ''}
          </button>
          <button class="subnav-tab-btn" data-tab="requests">
            <span>Milestone Guidance</span>
            <span class="tab-tag">${requests ? requests.length : 0} Reviews</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Left Column: Problem Statement & Guidance Requests
  const leftColHtml = `
    <div class="student-col-left">
      <!-- Selected Problem Statement -->
      <div class="portal-card" id="studentProblemSection">
        <div class="portal-card-header">
          <div class="portal-card-title">
            <span>Problem Statement: ${problem ? problem.ps_code : 'None Selected'}</span>
          </div>
          <span class="badge-domain">${problem ? problem.domain_name : 'General'}</span>
        </div>

        ${problem ? `
          <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; letter-spacing: -0.3px;">
            ${problem.title}
          </h3>
          <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 18px;">
            ${problem.description}
          </p>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-tertiary); margin-bottom: 8px;">
            Required Technical Tags &bull; Difficulty: ${problem.difficulty}
          </div>
          <div class="sim-tags-cluster">
            ${problem.keywords.map(k => `<span class="badge-tag highlight">#${k}</span>`).join('')}
          </div>
        ` : `
          <p style="color: var(--text-tertiary);">No problem statement selected yet.</p>
        `}
      </div>

      <!-- Mentorship Guidance & Milestone Requests -->
      <div class="portal-card" id="studentRequestsSection">
        <div class="portal-card-header">
          <div class="portal-card-title">
            <span>Milestone Guidance &amp; Review Sessions</span>
          </div>
          <button class="btn-secondary" style="font-size: 12px; padding: 6px 12px;" onclick="openRequestGuidanceModal()">
            + New Request
          </button>
        </div>

        ${requests && requests.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${requests.map(r => `
              <div class="request-item">
                <div class="request-item-header">
                  <span class="request-title">${r.milestone_title}</span>
                  <span class="${r.status === 'COMPLETED' ? 'status-pill-active' : 'status-pill-replaced'}">
                    ${r.status}
                  </span>
                </div>
                <div class="request-body">${r.description}</div>
                ${r.mentor_notes ? `
                  <div class="request-notes-box">
                    <strong>Mentor Remarks (${r.mentor_name}):</strong> ${r.mentor_notes}
                  </div>
                ` : `
                  <div style="font-size: 12px; color: var(--text-tertiary); font-style: italic;">
                    Pending mentor evaluation. You will receive notification during check-in.
                  </div>
                `}
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="background: #FAF8F5; border: 1px dashed var(--border-medium); border-radius: 12px; padding: 28px; text-align: center;">
            <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 12px;">
              No review requests logged yet. Reach out to your mentor for architecture or code feedback.
            </p>
            <button class="btn-primary" style="font-size: 12.5px; padding: 8px 16px;" onclick="openRequestGuidanceModal()">
              Request First Check-in &rarr;
            </button>
          </div>
        `}
      </div>
    </div>
  `;

  // Right Column: Assigned Mentor Profile & Hackathon Checklist
  const rightColHtml = `
    <div class="student-col-right">
      <!-- Assigned Mentor Card -->
      <div class="portal-card" id="studentMentorSection" style="border-color: #D3CDC2; box-shadow: var(--shadow-elevated);">
        <div class="portal-card-header">
          <div class="portal-card-title">
            <span>Assigned Faculty Mentor</span>
          </div>
          <span class="status-pill-active">&#9679; ACTIVE ALLOCATION</span>
        </div>

        ${assignment ? `
          <div style="margin-bottom: 14px;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between;">
              <div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px;">
                  ${assignment.full_name}
                </h3>
                <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
                  ${assignment.designation} &bull; ${assignment.department_name}
                </div>
              </div>
              <div class="sim-score-group">
                <span class="sim-score-value" style="font-size: 22px;">${assignment.match_score}%</span>
                <span class="sim-score-label">Match</span>
              </div>
            </div>
          </div>

          <div style="background: #FAF8F5; border: 1px solid var(--border-light); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12.5px; color: var(--badge-sage-text);">
            <span>&#10003; Direct Primary Domain &amp; Keyword Intersection Verified</span>
          </div>

          <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5;">
            <div><strong>Email:</strong> ${assignment.email}</div>
            <div><strong>Phone:</strong> ${assignment.phone || 'Campus Extension Available'}</div>
          </div>

          <div style="margin-bottom: 18px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 6px;">
              Mentor Technical Keywords
            </div>
            <div class="sim-tags-cluster">
              ${assignment.keywords.map(k => `<span class="badge-tag">#${k}</span>`).join('')}
            </div>
          </div>

          <button class="btn-primary" style="width: 100%; border-radius: var(--radius-md);" onclick="openRequestGuidanceModal()">
            Book 1-on-1 Guidance Slot
          </button>
        ` : `
          <div style="text-align: center; padding: 24px;">
            <p style="color: var(--text-tertiary); font-size: 13.5px; margin-bottom: 12px;">
              Coordinator allocation pending for your team.
            </p>
            <a href="#/coordinator" class="btn-secondary" style="font-size: 12.5px;">View Allocation Queue</a>
          </div>
        `}
      </div>

      <!-- Hackathon Milestone Checklist -->
      <div class="portal-card" id="studentMilestonesSection">
        <div class="portal-card-header">
          <div class="portal-card-title">
            <span>Hackathon Progress Milestones</span>
          </div>
          <span style="font-size: 11.5px; font-weight: 600; color: var(--text-tertiary);">Day 1 of 3</span>
        </div>

        <div class="milestone-stepper">
          <div class="milestone-step completed">
            <div class="milestone-icon">&#10003;</div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Milestone 1: Problem Selection</div>
              <div style="font-size: 11.5px; color: var(--text-secondary);">PS-04 locked with verified domain keywords.</div>
            </div>
          </div>
          <div class="milestone-step completed">
            <div class="milestone-icon">&#10003;</div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Milestone 2: Mentor Allocation</div>
              <div style="font-size: 11.5px; color: var(--text-secondary);">Assigned to ${assignment ? assignment.full_name : 'Faculty'}.</div>
            </div>
          </div>
          <div class="milestone-step">
            <div class="milestone-icon">3</div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Milestone 3: Architecture Check-in</div>
              <div style="font-size: 11.5px; color: var(--text-secondary);">Submit prototype pipeline for faculty review.</div>
            </div>
          </div>
          <div class="milestone-step">
            <div class="milestone-icon">4</div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Milestone 4: Final Evaluation Pitch</div>
              <div style="font-size: 11.5px; color: var(--text-secondary);">Live demonstration and technical defense.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `
    ${headerHtml}
    ${subnavHtml}
    <div class="container student-grid tab-pane-transition" id="studentMainGrid">
      ${leftColHtml}
      ${rightColHtml}
    </div>
  `;

  // Wire up In-Page Segmented Tab Switching
  initStudentTabs();
}

function initStudentTabs() {
  const tabs = document.querySelectorAll('#studentSubnavTabs .subnav-tab-btn');
  const problemCard = document.getElementById('studentProblemSection');
  const requestsCard = document.getElementById('studentRequestsSection');
  const mentorCard = document.getElementById('studentMentorSection');
  const milestonesCard = document.getElementById('studentMilestonesSection');
  const grid = document.getElementById('studentMainGrid');
  const leftCol = document.querySelector('.student-col-left');
  const rightCol = document.querySelector('.student-col-right');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-tab');

      // Re-trigger subtle entrance animation
      if (grid) {
        grid.classList.remove('tab-pane-transition');
        void grid.offsetWidth; // force reflow
        grid.classList.add('tab-pane-transition');
      }

      if (target === 'all') {
        if (grid) grid.style.gridTemplateColumns = '1.2fr 0.8fr';
        if (leftCol) leftCol.style.display = 'block';
        if (rightCol) rightCol.style.display = 'block';
        if (problemCard) problemCard.style.display = 'block';
        if (requestsCard) requestsCard.style.display = 'block';
        if (mentorCard) mentorCard.style.display = 'block';
        if (milestonesCard) milestonesCard.style.display = 'block';
      } else if (target === 'problem') {
        if (grid) grid.style.gridTemplateColumns = '1fr';
        if (leftCol) leftCol.style.display = 'block';
        if (rightCol) rightCol.style.display = 'none';
        if (problemCard) problemCard.style.display = 'block';
        if (requestsCard) requestsCard.style.display = 'none';
      } else if (target === 'mentor') {
        if (grid) grid.style.gridTemplateColumns = '1fr';
        if (leftCol) leftCol.style.display = 'none';
        if (rightCol) rightCol.style.display = 'block';
        if (mentorCard) mentorCard.style.display = 'block';
        if (milestonesCard) milestonesCard.style.display = 'block';
      } else if (target === 'requests') {
        if (grid) grid.style.gridTemplateColumns = '1fr';
        if (leftCol) leftCol.style.display = 'block';
        if (rightCol) rightCol.style.display = 'none';
        if (problemCard) problemCard.style.display = 'none';
        if (requestsCard) requestsCard.style.display = 'block';
      }
    });
  });
}

// Modal handling for Student Guidance Request
window.openRequestGuidanceModal = function() {
  if (!currentAssignedMentorId) {
    if (window.showToast) window.showToast('Mentor allocation is pending for your team.');
    return;
  }
  const modal = document.getElementById('studentRequestModal');
  if (modal) modal.classList.add('open');
};

export function initStudentModal() {
  const modal = document.getElementById('studentRequestModal');
  const closeBtn = document.getElementById('closeStudentRequestModal');
  const form = document.getElementById('studentRequestForm');

  if (!modal) return;

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('reqMilestoneTitle').value;
      const desc = document.getElementById('reqDescription').value;

      try {
        const res = await fetch('/api/mentorship-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: currentTeamId,
            facultyId: currentAssignedMentorId,
            milestoneTitle: title,
            description: desc
          })
        });

        const data = await res.json();
        if (data.success) {
          modal.classList.remove('open');
          form.reset();
          if (window.showToast) window.showToast(data.message);
          loadStudentPortal(currentTeamId);
        } else {
          alert(data.message);
        }
      } catch (err) {
        console.error('Error creating request:', err);
      }
    });
  }
}
