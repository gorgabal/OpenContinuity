import { Dropdown, Button } from 'flowbite-react';
import { useProject } from '../contexts/ProjectContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { addProject, updateProject, deleteProject } from '../services/database.js';

function ProjectSelector() {
  const { currentProject, projects, switchProject, isLoading } = useProject();
  const { userId } = useAuth();

  const handleCreateProject = async () => {
    if (!userId) {
      alert('User not authenticated. Please log in again.');
      return;
    }

    const projectName = prompt('Enter project name:');
    if (projectName && projectName.trim()) {
      try {
        const newProject = await addProject({
          name: projectName.trim(),
          ownerId: userId
        });
        // Projects list will update automatically via reactive subscription
        // Just switch to the newly created project
        await switchProject(newProject.id);
      } catch (err) {
        console.error('Failed to create project:', err);
        alert('Failed to create project. Please try again.');
      }
    }
  };

  const handleRenameProject = async () => {
    if (!currentProject) {
      alert('No project selected to rename.');
      return;
    }

    const newName = prompt('Enter new project name:', currentProject.name);
    if (newName && newName.trim() && newName.trim() !== currentProject.name) {
      try {
        await updateProject(currentProject.id, {
          name: newName.trim()
        });
        // The reactive subscription will update the project automatically
      } catch (err) {
        console.error('Failed to rename project:', err);
        alert('Failed to rename project. Please try again.');
      }
    }
  };

  const handleDeleteProject = async () => {
    if (!currentProject) {
      alert('No project selected to delete.');
      return;
    }

    const confirmDelete = confirm(
      `Are you sure you want to delete the project "${currentProject.name}"? This action cannot be undone.`
    );

    if (confirmDelete) {
      try {
        await deleteProject(currentProject.id);
        // The reactive subscription will update the projects list
        // ProjectContext will auto-select another project if available
      } catch (err) {
        console.error('Failed to delete project:', err);
        alert('Failed to delete project. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="text-gray-700 px-3 py-2">
        Loading projects...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Dropdown
        arrowIcon={true}
        inline
        label={
          <span className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-cyan-700 md:p-0 dark:text-white md:dark:hover:text-cyan-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent cursor-pointer">
            {currentProject ? currentProject.name : 'No Project Selected'}
          </span>
        }
      >
        {projects.length > 0 && (
          <>
            {projects.map((project) => (
              <Dropdown.Item
                key={project.id}
                onClick={() => switchProject(project.id)}
                className={currentProject?.id === project.id ? 'bg-cyan-50' : ''}
              >
                {project.name}
              </Dropdown.Item>
            ))}
            <Dropdown.Divider />
          </>
        )}
        {currentProject && (
          <>
            <Dropdown.Item onClick={handleRenameProject}>
              Rename Project
            </Dropdown.Item>
            <Dropdown.Item onClick={handleDeleteProject} className="text-red-600">
              Delete Project
            </Dropdown.Item>
            <Dropdown.Divider />
          </>
        )}
        <Dropdown.Item onClick={handleCreateProject}>
          + New Project
        </Dropdown.Item>
      </Dropdown>
    </div>
  );
}

export default ProjectSelector;
