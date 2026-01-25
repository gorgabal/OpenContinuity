import { Navbar, Dropdown } from 'flowbite-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import ProjectSelector from '../../components/ProjectSelector.jsx';
import SyncStatusIndicator from '../../components/SyncStatusIndicator.jsx';

function MainNav() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div>
      <Navbar fluid>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Navbar.Link as={Link} to="/costumes">
            Costumes
          </Navbar.Link>
          <Navbar.Link as={Link} to="/scene-overview">
            Scene Overview
          </Navbar.Link>
          <Navbar.Link as={Link} to="/characters">
            Characters
          </Navbar.Link>
        </Navbar.Collapse>
        <div className="flex md:order-2 gap-2 items-center">
          <SyncStatusIndicator />
          <ProjectSelector />
          <Dropdown
            arrowIcon={false}
            inline
            label={
              <span className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-cyan-700 md:p-0 dark:text-white md:dark:hover:text-cyan-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent cursor-pointer">
                Account
              </span>
            }
          >
            <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
          </Dropdown>
        </div>
      </Navbar>
    </div>
  );
}

export default MainNav;
