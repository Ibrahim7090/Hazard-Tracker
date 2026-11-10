import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { Button, Container, Form, Navbar } from 'react-bootstrap'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'leaflet/dist/leaflet.css'
import './App.css'

// A few sample hazard points are enough to show the map working before real data is connected.
const sampleHazards = [
  {
    id: 1,
    title: 'Flooded road',
    category: 'Drainage & Sanitation',
    description: 'Water is pooling near the bus stop after heavy rain.',
    lat: 1.2903,
    lng: 103.8519,
    priority: 'High',
    status: 'Pending',
  },
  {
    id: 2,
    title: 'Broken streetlight',
    category: 'Electrical & Utilities',
    description: 'One streetlight is not working on the main road.',
    lat: 1.2958,
    lng: 103.8561,
    priority: 'Medium',
    status: 'In review',
  },
  {
    id: 3,
    title: 'Large pothole',
    category: 'Road & Transport',
    description: 'A deep pothole is causing traffic issues.',
    lat: 1.2877,
    lng: 103.8462,
    priority: 'Low',
    status: 'Open',
  },
]

function HomePage() {
  return (
    <div className="page-shell" data-bs-theme="dark">
      <Navbar className="topbar">
        <Container fluid className="topbar-inner">
          <Navbar.Brand className="brand">HazardWatch</Navbar.Brand>

          <div className="topbar-actions">
            <Form.Control
              type="text"
              placeholder="Search hazards..."
              className="search-box"
            />
            <Link to="/report">
              <Button variant="success">Report a hazard</Button>
            </Link>
          </div>
        </Container>
      </Navbar>

      <div className="map-shell">
        <MapContainer center={[1.2903, 103.8519]} zoom={13} className="hazard-map">
          {/* CARTO Dark Matter gives the map a dark GitHub-like look with a proper attribution. */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={`https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${import.meta.env.VITE_CARTO_KEY}`}
          />

          {sampleHazards.map((hazard) => (
            <Marker key={hazard.id} position={[hazard.lat, hazard.lng]}>
              <Popup>
                <div className="popup-card">
                  <strong>{hazard.title}</strong>
                  <p>{hazard.category}</p>
                  <p>{hazard.description}</p>
                  <small>Status: {hazard.status}</small>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

function ReportPage() {
  return (
    <Container className="py-4">
      <h2 className="page-title">Report a hazard</h2>
      <p className="text-muted">This page will hold the form later.</p>
    </Container>
  )
}

function ReportsPage() {
  return (
    <Container className="py-4">
      <h2 className="page-title">Reports</h2>
      <p className="text-muted">This page will show hazard cards later.</p>
    </Container>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
