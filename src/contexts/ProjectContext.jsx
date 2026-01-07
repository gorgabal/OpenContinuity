import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getProjects$, getProjectById, getDatabase } from '../services/database.js';

const ProjectContext = createContext();

const CURRENT_PROJECT_KEY = 'current_project_id';

export function ProjectProvider({ children }) {
  const [currentProjectId, setCurrentProjectId] = useState(
    localStorage.getItem(CURRENT_PROJECT_KEY)
  );
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to projects observable for reactive updates
  useEffect(() => {
    let subscription;

    const setupProjectsSubscription = async () => {
      try {
        setIsLoading(true);

        // Ensure database is initialized
        await getDatabase();

        // Subscribe to reactive projects query
        const projects$ = await getProjects$();
        subscription = projects$.subscribe(allProjects => {
          setProjects(allProjects);
          setIsLoading(false);

          // Auto-select logic only runs when we have projects but no current selection
          const storedProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);

          if (storedProjectId) {
            // Verify stored project still exists
            const storedProject = allProjects.find(p => p.id === storedProjectId);
            if (storedProject) {
              setCurrentProjectId(storedProjectId);
              setCurrentProject(storedProject);
            } else {
              // Stored project doesn't exist anymore, clear it
              localStorage.removeItem(CURRENT_PROJECT_KEY);
              setCurrentProjectId(null);
              setCurrentProject(null);

              // Auto-select first project if available
              if (allProjects.length > 0) {
                const firstProject = allProjects[0];
                setCurrentProjectId(firstProject.id);
                setCurrentProject(firstProject);
                localStorage.setItem(CURRENT_PROJECT_KEY, firstProject.id);
              }
            }
          } else if (allProjects.length > 0 && !currentProjectId) {
            // No stored project but projects exist, select the first one
            const firstProject = allProjects[0];
            setCurrentProjectId(firstProject.id);
            setCurrentProject(firstProject);
            localStorage.setItem(CURRENT_PROJECT_KEY, firstProject.id);
          }
        });

      } catch (err) {
        console.error('Failed to setup projects subscription:', err);
        setIsLoading(false);
      }
    };

    setupProjectsSubscription();

    // Cleanup subscription
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []); // Only run once on mount

  const switchProject = async (projectId) => {
    try {
      const project = await getProjectById(projectId);
      if (project) {
        setCurrentProjectId(projectId);
        setCurrentProject(project);
        localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
      } else {
        console.error('Project not found:', projectId);
      }
    } catch (err) {
      console.error('Failed to switch project:', err);
    }
  };

  const refreshProjects = async () => {
    // Projects are now automatically updated via subscription
    // This function is kept for backward compatibility but does nothing
    // The reactive query will handle all updates automatically
    return Promise.resolve();
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProjectId,
        currentProject,
        projects,
        isLoading,
        switchProject,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

ProjectProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
