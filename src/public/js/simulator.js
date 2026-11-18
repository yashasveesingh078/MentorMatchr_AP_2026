// =============================================================================
// MentorMatchr: Live Match Simulator
// Replicates the interactive reference image simulator with live dynamic data
// =============================================================================

const SIM_PRESETS = {
  'CareSync AI': {
    teamId: 1,
    teamName: 'CareSync AI',
    problemId: 1,
    psCode: 'PS-04',
    title: 'Automated Medical Imaging Diagnostics Using Transformer Ensembles',
    domain: 'AI & Machine Learning',
    domainId: 1,
    tags: ['Healthcare Tech', '#PyTorch', '#Transformers', '#Medical Imaging', '#DICOM'],
    keywordNames: ['PyTorch', 'Transformers', 'Medical Imaging', 'DICOM', 'Python']
  },
  'SecureLedger': {
    teamId: 2,
    teamName: 'SecureLedger',
    problemId: 2,
    psCode: 'PS-07',
    title: 'SecureLedger: Decentralized Settlement with Zero-Knowledge Auditing',
    domain: 'FinTech & Blockchain',
    domainId: 5,
    tags: ['Cybersecurity', '#Solidity', '#Smart Contracts', '#Zero-Knowledge', '#Rust'],
    keywordNames: ['Solidity', 'Smart Contracts', 'Zero-Knowledge', 'Rust', 'PostgreSQL']
  },
  'AgriSense IoT': {
    teamId: 3,
    teamName: 'AgriSense IoT',
    problemId: 3,
    psCode: 'PS-02',
    title: 'AgriSense: Autonomous Crop Stress Detection via Edge-AI Drone Vision',
    domain: 'IoT & Smart Systems',
    domainId: 6,
    tags: ['AI & Machine Learning', '#Edge AI', '#OpenCV', '#MQTT', '#Sensor Networks'],
    keywordNames: ['Edge AI', 'OpenCV', 'MQTT', 'Sensor Networks', 'Python']
  }
};

let activeSimPreset = 'CareSync AI';

export function initSimulator() {
  const tabs = document.querySelectorAll('.sim-team-pill');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const teamKey = tab.getAttribute('data-team');
      if (SIM_PRESETS[teamKey]) {
        activeSimPreset = teamKey;
        renderSimulatorPreset(SIM_PRESETS[teamKey]);
      }
    });
  });

  // Render initial default preset (CareSync AI)
  renderSimulatorPreset(SIM_PRESETS['CareSync AI']);
}

async function renderSimulatorPreset(preset) {
  const metaEl = document.getElementById('simPsMeta');
  const titleEl = document.getElementById('simPsTitle');
  const tagsEl = document.getElementById('simTagsCluster');
  const recsContainer = document.getElementById('simRecommendationsList');

  // Update Problem Statement Box with subtle crossfade
  const problemBox = document.getElementById('simProblemBox');
  problemBox.classList.remove('sim-fade-in');
  recsContainer.classList.remove('sim-fade-in');
  void problemBox.offsetWidth; // force reflow for smooth re-trigger
  problemBox.classList.add('sim-fade-in');
  recsContainer.classList.add('sim-fade-in');

  metaEl.textContent = `PROBLEM STATEMENT #${preset.psCode} • TEAM ${preset.teamName.toUpperCase()}`;
  titleEl.textContent = preset.title;

  tagsEl.innerHTML = `
    <span class="badge-domain">${preset.domain}</span>
    ${preset.tags.map(t => `<span class="badge-tag">${t}</span>`).join('')}
  `;

  // Fetch live recommendations for this problem
  try {
    const res = await fetch('/api/match/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId: preset.problemId,
        domainId: preset.domainId,
        keywordNames: preset.keywordNames,
        availableOnly: false
      })
    });
    const data = await res.json();
    const recommendations = data.recommendations || [];

    if (recommendations.length === 0) {
      recsContainer.innerHTML = '<div style="padding: 16px; font-size: 13px; color: var(--text-tertiary);">No mentors currently meet this criteria.</div>';
      return;
    }

    const topMatch = recommendations[0];
    const secondaryMatches = recommendations.slice(1, 3);

    let html = `
      <!-- Top Match Faculty Card -->
      <div class="sim-faculty-card top-match">
        <div class="sim-faculty-card-header">
          <span class="sim-faculty-name">${topMatch.full_name}</span>
          <span class="sim-badge-top-match">TOP MATCH</span>
        </div>
        <div class="sim-faculty-dept">${topMatch.department_name}</div>
        <div class="sim-match-explanation">
          <span>${topMatch.match_explanation}</span>
        </div>
        <div class="sim-card-bottom">
          <div class="sim-score-group">
            <span class="sim-score-value">${topMatch.compatibility_score}%</span>
            <span class="sim-score-label">Compatibility</span>
            <span class="sim-capacity-badge">${topMatch.active_teams}/${topMatch.max_teams} Available</span>
          </div>
          <button class="sim-btn-assign" onclick="handleSimAssign(${preset.teamId}, ${topMatch.faculty_id}, '${preset.teamName}', '${topMatch.full_name}', ${topMatch.compatibility_score})">
            Assign Mentor
          </button>
        </div>
      </div>
    `;

    // Secondary matches
    secondaryMatches.forEach(sec => {
      const topExp = sec.expertise[0]?.expertise_name || sec.keywords.slice(0, 2).join(', ');
      html += `
        <div class="sim-secondary-faculty-row" style="margin-bottom: 8px;">
          <div>
            <div class="sim-sec-name">${sec.full_name}</div>
            <div class="sim-sec-sub">${sec.department_name} • ${topExp}</div>
          </div>
          <div>
            <div class="sim-sec-score">${sec.compatibility_score}%</div>
            <div class="sim-sec-load">Load: ${sec.active_teams}/${sec.max_teams}</div>
          </div>
        </div>
      `;
    });

    recsContainer.innerHTML = html;
  } catch (err) {
    console.error('Error fetching simulator recommendations:', err);
  }
}

window.handleSimAssign = async function(teamId, facultyId, teamName, facultyName, score) {
  try {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        facultyId,
        coordinatorId: 1,
        matchScore: score
      })
    });
    const data = await res.json();
    if (data.success) {
      if (window.showToast) {
        window.showToast(`Assigned ${facultyName} to ${teamName} (${score}% match)`);
      }
      // Refresh teams table and simulator
      if (window.refreshTeamsAndStats) window.refreshTeamsAndStats();
      if (SIM_PRESETS[activeSimPreset]) {
        renderSimulatorPreset(SIM_PRESETS[activeSimPreset]);
      }
    } else {
      if (window.showToast) {
        window.showToast(`Assignment notice: ${data.message}`);
      }
    }
  } catch (err) {
    console.error('Assignment error:', err);
  }
};
