import { Client, Account } from 'appwrite';

const AUTH_FLAG_KEY = 'appwrite_authenticated';
const AUTH_CHANGE_EVENT = 'auth-state-changed';

// Dispatch custom event when auth state changes
function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

// Set flag on successful login
export function setAuthFlag() {
  localStorage.setItem(AUTH_FLAG_KEY, 'true');
  notifyAuthChange();
}

// Check if authenticated (synchronous, no network)
export function isAuthenticatedLocally() {
  return localStorage.getItem(AUTH_FLAG_KEY) === 'true';
}

// Clear flag on logout
export function clearAuthFlag() {
  localStorage.removeItem(AUTH_FLAG_KEY);
  notifyAuthChange();
}

// Listen for auth state changes
export function onAuthChange(callback) {
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, callback);
}

// Logout function
export async function logout() {
  try {
    // Delete Appwrite session
    const client = new Client()
      .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
      .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

    const account = new Account(client);
    await account.deleteSession('current');
  } catch (err) {
    console.warn('Failed to delete Appwrite session:', err.message);
  }

  try {
    // Clear RxDB database
    const { getDatabase } = await import('./database.js');
    const db = await getDatabase();
    await db.remove();
    console.log('RxDB database cleared');
  } catch (err) {
    console.warn('Failed to clear RxDB database:', err.message);
  }

  // Clear all browser storage
  localStorage.clear();
  sessionStorage.clear();

  // Auth flag is already cleared by localStorage.clear()
  // But we still need to notify auth change
  notifyAuthChange();
}
