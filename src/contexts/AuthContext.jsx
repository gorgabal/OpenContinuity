import { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { Client, Account } from 'appwrite';

const AuthContext = createContext();

const AUTH_FLAG_KEY = 'appwrite_authenticated';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem(AUTH_FLAG_KEY) === 'true'
  );

  const login = () => {
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
    setIsAuthenticated(true);
  };

  const logout = async () => {
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
      const { getDatabase } = await import('../services/database.js');
      const db = await getDatabase();
      await db.remove();
      console.log('RxDB database cleared');
    } catch (err) {
      console.warn('Failed to clear RxDB database:', err.message);
    }

    // Clear all browser storage
    localStorage.clear();
    sessionStorage.clear();

    // Update auth state
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}