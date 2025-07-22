import { Navbar } from "flowbite-react"
import { Link } from "react-router-dom"
function MainNav() {
  return (
    <div>
      <Navbar fluid>
      <Navbar.Toggle />
        <Navbar.Collapse>
          <Navbar.Link as={Link} to="/">Home</Navbar.Link>
          <Navbar.Link as={Link} to="/costumes">Costumes</Navbar.Link>
          <Navbar.Link as={Link} to="/scene-overview">Scene Overview</Navbar.Link>
          <Navbar.Link as={Link} to="/shootingday">Shooting Day</Navbar.Link>
          <Navbar.Link as={Link} to="/scenedetail">Scene detail page</Navbar.Link>
        </Navbar.Collapse>
      </Navbar>
    </div>
  )
}

export default MainNav 