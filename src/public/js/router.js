// =============================================================================
// MentorMatchr: Role-Guarded Client-Side Router
// Enforces strict isolation between Student, Faculty, and Admin views
// =============================================================================

import { getCurrentUser, updateNavUserDisplay } from './auth.js';
import { loadStudentPortal } from './student.js';
import { loadFacultyPortal } from './faculty.js';

const ROUTES = {
  '': 'view-login',
  'login': 'view-login',
  'home': 'view-home',
  'student': 'view-student',
  'faculty': 'view-faculty',
  'coordinator': 'view-coordinator',
  'how-it-works': 'view-how-it-works'
};

export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  window.addEventListener('load', handleRouteChange);
}

export function navigateTo(route) {
  window.location.hash = `#/${route.replace(/^#?\/?/, '')}`;
}

export function handleRouteChange() {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  let routeKey = hash.split('?')[0];

  const user = getCurrentUser();

  // "Always keep login screen first" rule
  if (!user) {
    if (routeKey !== 'login' && routeKey !== 'how-it-works') {
      routeKey = 'login';
      window.location.hash = '#/login';
      return;
    }
  } else {
    // If logged in and on empty or login, redirect to role portal
    if (!routeKey || routeKey === 'login') {
      if (user.role === 'student') {
        routeKey = 'student';
        window.location.hash = '#/student';
        return;
      } else if (user.role === 'faculty') {
        routeKey = 'faculty';
        window.location.hash = '#/faculty';
        return;
      } else if (user.role === 'coordinator') {
        routeKey = 'coordinator';
        window.location.hash = '#/coordinator';
        return;
      }
    }

    // Strict role isolation: Students CANNOT access faculty/coordinator pages
    if (user.role === 'student' && (routeKey === 'faculty' || routeKey === 'coordinator')) {
      routeKey = 'student';
      window.location.hash = '#/student';
      if (window.showToast) window.showToast('Faculty features are restricted to faculty accounts.');
      return;
    }

    // Strict role isolation: Faculty CANNOT access student/coordinator pages
    if (user.role === 'faculty' && (routeKey === 'student' || routeKey === 'coordinator')) {
      routeKey = 'faculty';
      window.location.hash = '#/faculty';
      if (window.showToast) window.showToast('Student features are restricted to student team accounts.');
      return;
    }
  }

  const viewId = ROUTES[routeKey] || (user ? (user.role === 'student' ? 'view-student' : 'view-faculty') : 'view-login');

  // Update active page view
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });

  const activeView = document.getElementById(viewId);
  if (activeView) {
    activeView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update dynamic navbar according to role
  updateNavUserDisplay();

  // Call page-specific loaders
  if (viewId === 'view-student' && user) {
    const teamId = user.role === 'student' ? user.id : 1;
    loadStudentPortal(teamId);
  } else if (viewId === 'view-faculty' && user) {
    const facultyId = user.role === 'faculty' ? user.id : 1;
    loadFacultyPortal(facultyId);
  } else if (viewId === 'view-coordinator') {
    if (window.refreshTeamsAndStats) window.refreshTeamsAndStats();
  }
}
