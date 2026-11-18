// =============================================================================
// MentorMatchr: Role-Isolated Authentication & Navigation Manager
// Completely isolates Student vs Faculty views, features, and navigation links
// =============================================================================

import { navigateTo } from './router.js';

let currentUser = null;

// Check local storage for persisted user
try {
  const saved = localStorage.getItem('mm_user');
  if (saved) {
    currentUser = JSON.parse(saved);
  }
} catch (e) {
  console.warn('Could not read user from localStorage');
}

export function getCurrentUser() {
  return currentUser;
}

export function logout() {
  currentUser = null;
  localStorage.removeItem('mm_user');
  updateNavUserDisplay();
  if (window.showToast) window.showToast('Logged out. Please select your portal to sign in.');
  navigateTo('login');
}

export function updateNavUserDisplay() {
  const navContainer = document.getElementById('dynamicNavLinks');
  const nameEl = document.getElementById('userNameDisplay');
  const roleEl = document.getElementById('userRoleDisplay');
  const btnEl = document.getElementById('authBtn');
  const logoLink = document.getElementById('logoLink');

  if (logoLink) {
    if (!currentUser) {
      logoLink.setAttribute('href', '#/login');
    } else if (currentUser.role === 'student') {
      logoLink.setAttribute('href', '#/student');
    } else if (currentUser.role === 'faculty') {
      logoLink.setAttribute('href', '#/faculty');
    } else if (currentUser.role === 'coordinator') {
      logoLink.setAttribute('href', '#/coordinator');
    }
  }

  if (!navContainer) return;

  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  const routeKey = hash.split('?')[0];

  // 1. GUEST / LOGGED OUT: No internal portal links exposed
  if (!currentUser) {
    navContainer.innerHTML = `
      <li><a href="#/login" class="${routeKey === 'login' ? 'active' : ''}">Sign In</a></li>
      <li><a href="#/how-it-works" class="${routeKey === 'how-it-works' ? 'active' : ''}">How It Works</a></li>
    `;
    if (nameEl) nameEl.textContent = 'Welcome to Portal';
    if (roleEl) roleEl.textContent = 'Sign In to Access';
    if (btnEl) {
      btnEl.textContent = 'Sign In';
      btnEl.onclick = () => navigateTo('login');
    }
    return;
  }

  // 2. STUDENT TEAM LOGGED IN: Ultra-clean, minimal navbar (No cluttering on-page anchor links)
  if (currentUser.role === 'student') {
    navContainer.innerHTML = `
      <li><span class="nav-portal-badge"><span class="badge-dot"></span> Student Workspace</span></li>
      <li><a href="#/how-it-works" class="${routeKey === 'how-it-works' ? 'active' : ''}">How It Works</a></li>
    `;
    if (nameEl) nameEl.textContent = currentUser.name;
    if (roleEl) roleEl.textContent = 'Student Team';
    if (btnEl) {
      btnEl.textContent = 'Logout';
      btnEl.onclick = logout;
    }
    return;
  }

  // 3. FACULTY MENTOR LOGGED IN: Ultra-clean, minimal navbar
  if (currentUser.role === 'faculty') {
    navContainer.innerHTML = `
      <li><span class="nav-portal-badge"><span class="badge-dot"></span> Faculty Dashboard</span></li>
      <li><a href="#/how-it-works" class="${routeKey === 'how-it-works' ? 'active' : ''}">How It Works</a></li>
    `;
    if (nameEl) nameEl.textContent = currentUser.name;
    if (roleEl) roleEl.textContent = 'Faculty Mentor';
    if (btnEl) {
      btnEl.textContent = 'Logout';
      btnEl.onclick = logout;
    }
    return;
  }

  // 4. COORDINATOR / ADMIN LOGGED IN: Ultra-clean, minimal navbar
  if (currentUser.role === 'coordinator') {
    navContainer.innerHTML = `
      <li><span class="nav-portal-badge"><span class="badge-dot"></span> Coordinator Hub</span></li>
      <li><a href="#/how-it-works" class="${routeKey === 'how-it-works' ? 'active' : ''}">How It Works</a></li>
    `;
    if (nameEl) nameEl.textContent = currentUser.name;
    if (roleEl) roleEl.textContent = 'Head Coordinator';
    if (btnEl) {
      btnEl.textContent = 'Logout';
      btnEl.onclick = logout;
    }
  }
}

window.scrollToElement = function(id) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
};

export function initAuth() {
  updateNavUserDisplay();
  initDedicatedLoginPage();
}

function initDedicatedLoginPage() {
  const switchBtns = document.querySelectorAll('.login-type-btn');
  const emailInput = document.getElementById('dedicatedLoginEmail');
  const form = document.getElementById('dedicatedLoginForm');
  const descEl = document.getElementById('loginRoleDescription');
  let currentDedicatedRole = 'student';

  switchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const role = btn.getAttribute('data-role');
      currentDedicatedRole = role;

      if (emailInput) {
        if (role === 'student') {
          emailInput.value = 'lead@caresync.ai';
          if (descEl) descEl.textContent = 'Sign in with your team credentials to view your problem statement requirements and collaborate with your assigned mentor.';
        } else if (role === 'faculty') {
          emailInput.value = 'arun.sharma@inst.edu';
          if (descEl) descEl.textContent = 'Sign in with your faculty credentials to manage your mentoring workload, review student milestones, and set availability.';
        } else if (role === 'coordinator') {
          emailInput.value = 'p.nair@codefest.edu';
          if (descEl) descEl.textContent = 'Sign in with administrative credentials to access the full BCNF mentor allocation matrix and audit trail.';
        }
      }
    });
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput ? emailInput.value : '';
      await performLogin(email, currentDedicatedRole);
    });
  }
}

export async function performLogin(email, role) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('mm_user', JSON.stringify(currentUser));
      updateNavUserDisplay();
      if (window.showToast) window.showToast(`Signed in as ${currentUser.name}`);

      // Route immediately into the role-specific workspace
      if (role === 'student') {
        navigateTo('student');
      } else if (role === 'faculty') {
        navigateTo('faculty');
      } else {
        navigateTo('coordinator');
      }
    }
  } catch (err) {
    console.error('Login error:', err);
  }
}

window.quickLogin = function(email, role) {
  performLogin(email, role);
};
