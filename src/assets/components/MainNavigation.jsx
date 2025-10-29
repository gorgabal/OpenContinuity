import { Navbar } from "flowbite-react"
import { Link } from "react-router-dom"
function MainNav() {
  return (
    <div>
      <Navbar fluid>
      <Navbar.Toggle />
        <Navbar.Collapse>
          <Navbar.Link as={Link} to="/costumes">Costumes</Navbar.Link>
          <Navbar.Link as={Link} to="/scene-overview">Scene Overview</Navbar.Link>
          <Navbar.Link as={Link} to="/characters">Characters</Navbar.Link>
        </Navbar.Collapse>
      </Navbar>
    </div>
  )
}

export default MainNav
