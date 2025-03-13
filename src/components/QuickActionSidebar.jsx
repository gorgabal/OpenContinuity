import { Navbar } from "flowbite-react"

function QuickActionSidebar() {
  return (
    <div>
      <Navbar>
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

export default QuickActionSidebar 