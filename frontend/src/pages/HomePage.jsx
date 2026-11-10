import { useEffect, useState } from 'react'
import { Button, Container, Form, Navbar } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'

const DEFAULT_CENTER = [30.1575, 71.5249]

const sampleHazards = [
  {
    id: 1,
    title: 'Flooded road',
    category: 'Drainage & Sanitation',
    description: 'Water is pooling near the bus stop after heavy rain.',
    lat: 30.1612,
    lng: 71.5301,
    priority: 'High',
    status: 'Pending',
  },
  {
    id: 2,
    title: 'Broken streetlight',
    category: 'Electrical & Utilities',
    description: 'One streetlight is not working on the main road.',
    lat: 30.1549,
    lng: 71.5198,
    priority: 'Medium',
    status: 'In review',
  },
  {
    id: 3,
    title: 'Large pothole',
    category: 'Road & Transport',
    description: 'A deep pothole is causing traffic issues.',
    lat: 30.1583,
    lng: 71.5262,
    priority: 'Low',
    status: 'Open',
  },
]

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

  useEffect(() => {
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
