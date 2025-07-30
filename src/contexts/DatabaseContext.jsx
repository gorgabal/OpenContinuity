import { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  initDatabase,
  addCostume,
  getCostumes,
  getCostumes$,
} from '../services/database.js';

const DatabaseContext = createContext();

export function DatabaseProvider({ children }) {
  const [database, setDatabase] = useState(null);
  const [costumes, setCostumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let subscription;

    const setupDatabase = async () => {
      try {
        setIsLoading(true);
        const db = await initDatabase();
        setDatabase(db);

        // Get initial costumes
        const initialCostumes = await getCostumes();
        setCostumes(initialCostumes);

        // Subscribe to costume changes
        const costumes$ = await getCostumes$();
        subscription = costumes$.subscribe(updatedCostumes => {
          setCostumes(updatedCostumes);
        });

        setError(null);
      } catch (err) {
        console.error('Database setup failed:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    setupDatabase();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const createCostume = async (costumeData = {}) => {
    try {
      const newCostume = await addCostume(costumeData);
      return newCostume;
    } catch (err) {
      console.error('Failed to create costume:', err);
      setError(err.message);
      throw err;
    }
  };

  const value = {
    database,
    costumes,
    isLoading,
    error,
    createCostume,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

DatabaseProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
