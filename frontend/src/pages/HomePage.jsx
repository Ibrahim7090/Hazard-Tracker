import { useEffect, useState } from 'react'
import { Button, Container, Navbar } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'

const DEFAULT_CENTER = [30.1575, 71.5249]

function FlyToUser({ position }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(position, 14)
    }
  }, [position, map])

  return null
}

export default function HomePage() {
  const [userPosition, setUserPosition] = useState(null)
  const [reports, setReports] = useState([])

  useEffect(() => {
    fetch('/api/reports')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load reports')
        return response.json()
      })
      .then(setReports)
      .catch((error) => console.error(error))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition = [position.coords.latitude, position.coords.longitude]
        setUserPosition(nextPosition)
      },
      () => {
        console.log('Location blocked or unavailable, using default center.')
      },
    )
  }, [])

  return (
    <div className="page-shell" data-bs-theme="dark">
      <Navbar className="topbar">
        <Container fluid className="topbar-inner">
          <Navbar.Brand className="brand">HazardWatch</Navbar.Brand>

          <div className="topbar-actions">
            <Button as={Link} to="/hazards" variant="outline-light">
              Search hazards
            </Button>
            <Link to="/report">
              <Button variant="success">Report a hazard</Button>
            </Link>
          </div>
        </Container>
      </Navbar>

      <div className="map-shell">
        <MapContainer center={DEFAULT_CENTER} zoom={13} className="hazard-map">
          {/* Dark CARTO tiles keep the map readable and match the app theme. */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={`https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${import.meta.env.VITE_CARTO_KEY}`}
          />

          {/* This moves the map to the user's location as soon as the browser provides it. */}
          <FlyToUser position={userPosition} />

          {userPosition && (
            <Marker position={userPosition}>
              <Popup>You are here</Popup>
            </Marker>
          )}

          {reports.map((report) => (
            <Marker key={report.id} position={[report.latitude, report.longitude]}>
              <Popup>
                <div className="popup-card">
                  <strong>{report.title}</strong>
                  <p>{report.hazard_type} · {report.category}</p>
                  <p>{report.description}</p>
                  {report.location && <p>{report.location}</p>}
                  <small>Priority: {report.priority} · Status: {report.status}</small>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
