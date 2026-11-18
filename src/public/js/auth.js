// =============================================================================
// MentorMatchr: Authentication & User State
// =============================================================================

let currentUser = {
  id: 1,
  name: 'Dr. Arun Sharma',
  email: 'arun.sharma@inst.edu',
  role: 'faculty',
  designation: 'Faculty'
};

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

export function updateNavUserDisplay() {
  const nameEl = document.getElementById('userNameDisplay');
  const roleEl = document.getElementById('userRoleDisplay');
  const btnEl = document.getElementById('authBtn');

  if (currentUser) {
    nameEl.textContent = currentUser.name;
    roleEl.textContent = currentUser.role === 'coordinator' ? 'Coordinator' : 'Faculty';
    btnEl.textContent = 'Logout';
  } else {
    nameEl.textContent = 'Guest';
    roleEl.textContent = 'Sign In to Portal';
    btnEl.textContent = 'Sign In';
  }
}

export function initAuth() {
  updateNavUserDisplay();

  const authBtn = document.getElementById('authBtn');
  const modal = document.getElementById('loginModal');
  const closeBtn = document.getElementById('closeLoginModal');
  const loginForm = document.getElementById('loginForm');
  const tabCoord = document.getElementById('tabCoordinator');
  const tabFac = document.getElementById('tabFaculty');

  let selectedRole = 'coordinator';

  tabCoord.addEventListener('click', () => {
    selectedRole = 'coordinator';
    tabCoord.classList.add('active');
    tabFac.classList.remove('active');
    document.getElementById('loginEmail').value = 'p.nair@codefest.edu';
  });

  tabFac.addEventListener('click', () => {
    selectedRole = 'faculty';
    tabFac.classList.add('active');
    tabCoord.classList.remove('active');
    document.getElementById('loginEmail').value = 'arun.sharma@inst.edu';
  });

  authBtn.addEventListener('click', () => {
    if (currentUser) {
      // Logout
      currentUser = null;
      localStorage.removeItem('mm_user');
      updateNavUserDisplay();
      if (window.showToast) window.showToast('Logged out successfully.');
    } else {
      modal.classList.add('open');
    }
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('open');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: selectedRole })
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        localStorage.setItem('mm_user', JSON.stringify(currentUser));
        updateNavUserDisplay();
        modal.classList.remove('open');
        if (window.showToast) window.showToast(`Signed in as ${currentUser.name}`);
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  });
}

window.quickLogin = function(email, role) {
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('mm_user', JSON.stringify(currentUser));
      updateNavUserDisplay();
      document.getElementById('loginModal').classList.remove('open');
      if (window.showToast) window.showToast(`Signed in as ${currentUser.name}`);
    }
  });
};
