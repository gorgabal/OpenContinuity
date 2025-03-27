import { Navbar } from "flowbite-react"

function MainNav() {
  return (
    <div>
      <Navbar fluid>
      <Navbar.Toggle />
        <Navbar.Collapse>
          <Navbar.Link href="/">Home</Navbar.Link>
          <Navbar.Link href="/costumes">Costumes</Navbar.Link>
          <Navbar.Link href="/scene-overview">Scene Overview</Navbar.Link>
          <Navbar.Link href="/shootingday">Shooting Day</Navbar.Link>
        </Navbar.Collapse>
      </Navbar>
    </div>
  )
}

export default MainNav 