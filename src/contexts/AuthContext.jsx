import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Client, Account } from 'appwrite';

const AuthContext = createContext();

const AUTH_FLAG_KEY = 'appwrite_authenticated';
const USER_ID_KEY = 'appwrite_user_id';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem(AUTH_FLAG_KEY) === 'true'
  );
  const [userId, setUserId] = useState(
    localStorage.getItem(USER_ID_KEY)
  );

  // Fetch user ID on mount if authenticated but no userId
  useEffect(() => {
    const fetchUserId = async () => {
      if (isAuthenticated && !userId) {
        try {
          const client = new Client()
            .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
            .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

          const account = new Account(client);
          const user = await account.get();

          setUserId(user.$id);
          localStorage.setItem(USER_ID_KEY, user.$id);
        } catch (err) {
          console.error('Failed to fetch user:', err);
          // If we can't get the user, they're not really authenticated
          setIsAuthenticated(false);
          localStorage.removeItem(AUTH_FLAG_KEY);
        }
      }
    };

    fetchUserId();
  }, [isAuthenticated, userId]);

  const login = (userIdValue) => {
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
    setIsAuthenticated(true);
    if (userIdValue) {
      localStorage.setItem(USER_ID_KEY, userIdValue);
      setUserId(userIdValue);
    }
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
      const { clearDatabase } = await import('../services/database.js');
      await clearDatabase();
      console.log('RxDB database cleared');
    } catch (err) {
      console.warn('Failed to clear RxDB database:', err.message);
    }

    // Clear all browser storage
    localStorage.clear();
    sessionStorage.clear();

    // Update auth state
    setIsAuthenticated(false);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userId, login, logout }}>
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