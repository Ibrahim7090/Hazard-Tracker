import { useEffect, useState } from 'react'
import { Badge, Button, Card, Col, Container, Form, Modal, Navbar, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'

const PRIORITY_ORDER = { High: 3, Medium: 2, Low: 1 }
const HAZARD_CATEGORIES = [
  'Road & Transport',
  'Drainage & Sanitation',
  'Electrical & Utilities',
  'Public Infrastructure',
  'Environmental',
  'Other',
]

function distanceInKm(from, report) {
  const radians = (degrees) => (degrees * Math.PI) / 180
  const latitudeDifference = radians(report.latitude - from.latitude)
  const longitudeDifference = radians(report.longitude - from.longitude)
  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(report.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function priorityVariant(priority) {
  if (priority === 'High') return 'danger'
  if (priority === 'Medium') return 'warning'
  return 'primary'
}

function dangerVariant(dangerLevel) {
  if (dangerLevel === 'High') return 'danger'
  if (dangerLevel === 'Moderate') return 'warning'
  return 'success'
}

function HazardCard({ report, userLocation, onDeleted, onView }) {
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleSummary() {
    setSummaryLoading(true)
    setSummaryError('')

    try {
      const response = await fetch(`/api/reports/${report.id}/summary`, {
        method: 'POST',
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Could not create an AI summary.')
      }
      setSummary(result)
    } catch (error) {
      setSummaryError(error.message || 'Could not create an AI summary.')
    } finally {
      setSummaryLoading(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${report.title}"? This cannot be undone.`)) {
      return
    }

    setDeleting(true)
    setDeleteError('')
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Could not delete the hazard.')
      }
      onDeleted(report.id)
    } catch (error) {
      setDeleteError(error.message || 'Could not delete the hazard.')
      setDeleting(false)
    }
  }

  return (
    <Card className="report-card-item">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <Card.Title className="mb-0">{report.title}</Card.Title>
          <Badge bg={priorityVariant(report.priority)}>{report.priority}</Badge>
        </div>
        <p className="text-muted small mb-2">{report.hazard_type} · {report.category}</p>
        {userLocation && (
          <p className="text-muted small mb-3">
            {distanceInKm(userLocation, report).toFixed(1)} km away
          </p>
        )}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Badge bg="secondary">{report.status}</Badge>
          <Button
            variant="outline-light"
            size="sm"
            type="button"
            onClick={() => onView(report)}
          >
            View hazard
          </Button>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button
            variant="outline-info"
            size="sm"
            type="button"
            onClick={handleSummary}
            disabled={summaryLoading}
          >
            {summaryLoading ? 'Summarizing...' : summary ? 'Refresh AI summary' : 'AI Summary'}
          </Button>
          {!report.is_demo && (
            <Button
              variant="outline-danger"
              size="sm"
              type="button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete hazard'}
            </Button>
          )}
        </div>
        {summary && (
          <p className="ai-summary mt-3 mb-0" role="status">
            {summary.summary}{' '}
            <Badge bg={dangerVariant(summary.danger_level)}>{summary.danger_level} danger</Badge>
          </p>
        )}
        {summaryError && <p className="text-danger small mt-2 mb-0" role="alert">{summaryError}</p>}
        {deleteError && <p className="text-danger small mt-2 mb-0" role="alert">{deleteError}</p>}
      </Card.Body>
    </Card>
  )
}

export default function HazardsPage() {
  const [reports, setReports] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('loading')
  const [locationAttempt, setLocationAttempt] = useState(0)
  const [sortBy, setSortBy] = useState('distance')
  const [titleSearch, setTitleSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [error, setError] = useState('')

  function handleDeleted(reportId) {
    setReports((currentReports) => currentReports.filter((report) => report.id !== reportId))
    setSelectedReport((currentReport) => (
      currentReport?.id === reportId ? null : currentReport
    ))
  }

  useEffect(() => {
    fetch('/api/reports')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load hazards.')
        return response.json()
      })
      .then(setReports)
      .catch((loadError) => setError(loadError.message || 'Could not load hazards.'))
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable')
      return
    }

    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ latitude: coords.latitude, longitude: coords.longitude })
        setLocationStatus('ready')
      },
      () => setLocationStatus('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [locationAttempt])

  const sortedReports = [...reports].sort((first, second) => {
    if (sortBy === 'priority') {
      const priorityDifference = PRIORITY_ORDER[second.priority] - PRIORITY_ORDER[first.priority]
      if (priorityDifference) return priorityDifference
    }

    if (userLocation) {
      return distanceInKm(userLocation, first) - distanceInKm(userLocation, second)
    }
    return 0
  })
  const visibleReports = sortedReports.filter((report) => {
    const matchesSearch = report.title.toLowerCase().includes(titleSearch.trim().toLowerCase())
    return matchesSearch &&
      (!category || report.category === category) &&
      (!status || report.status === status)
  })

  return (
    <div className="page-shell" data-bs-theme="dark">
      <Navbar className="topbar">
        <Container fluid className="topbar-inner">
          <Navbar.Brand className="brand">HazardWatch</Navbar.Brand>
          <div className="topbar-actions">
            <Button as={Link} to="/" variant="outline-light">Back to map</Button>
            <Button as={Link} to="/report" variant="success">Report a hazard</Button>
          </div>
        </Container>
      </Navbar>

      <Container className="py-4">
        <div className="mb-4">
          <h2 className="page-title mb-3">Hazards</h2>
          <div className="d-flex flex-wrap gap-2 hazard-filters">
            <Form.Control
              aria-label="Search hazards by title"
              className="hazard-search"
              type="search"
              placeholder="Search by title..."
              value={titleSearch}
              onChange={(event) => setTitleSearch(event.target.value)}
            />
            <Form.Select
              aria-label="Sort hazards"
              className="hazard-sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="distance">Sort by distance</option>
              <option value="priority">Sort by priority</option>
            </Form.Select>
            <Form.Select
              aria-label="Filter hazards by category"
              className="hazard-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {HAZARD_CATEGORIES.map((hazardCategory) => (
                <option key={hazardCategory}>{hazardCategory}</option>
              ))}
            </Form.Select>
            <Form.Select
              aria-label="Filter hazards by status"
              className="hazard-filter"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option>Pending</option>
              <option>In review</option>
              <option>Resolved</option>
            </Form.Select>
          </div>
        </div>

        {locationStatus === 'loading' && <p className="text-info" role="status">Getting your location...</p>}
        {(locationStatus === 'error' || locationStatus === 'unavailable') && (
          <div className="text-warning mb-3" role="status">
            <span>Location is unavailable. Hazards are shown without distance sorting. </span>
            <Button
              variant="outline-light"
              size="sm"
              type="button"
              onClick={() => setLocationAttempt((attempt) => attempt + 1)}
            >
              Retry location
            </Button>
          </div>
        )}
        {error && <p className="text-danger" role="alert">{error}</p>}

        <Row className="g-3">
          {!error && visibleReports.length === 0 && (
            <Col xs={12}>
              <p className="text-muted">
                {titleSearch.trim() || category || status
                  ? 'No hazards match your search and filters.'
                  : 'No hazards have been reported yet.'}
              </p>
            </Col>
          )}
          {visibleReports.map((report) => (
            <Col key={report.id} md={6} lg={4}>
              <HazardCard
                report={report}
                userLocation={userLocation}
                onDeleted={handleDeleted}
                onView={setSelectedReport}
              />
            </Col>
          ))}
        </Row>
      </Container>

      <Modal
        show={Boolean(selectedReport)}
        onHide={() => setSelectedReport(null)}
        centered
        data-bs-theme="dark"
      >
        {selectedReport && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>{selectedReport.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedReport.image_path && (
                <img
                  className="hazard-detail-image mb-3"
                  src={`/api/uploads/${encodeURIComponent(selectedReport.image_path)}`}
                  alt={selectedReport.title}
                />
              )}
              <dl className="hazard-detail-list mb-0">
                <dt>Category</dt><dd>{selectedReport.category}</dd>
                <dt>Hazard type</dt><dd>{selectedReport.hazard_type}</dd>
                <dt>Description</dt><dd>{selectedReport.description}</dd>
                <dt>Location</dt><dd>{selectedReport.location || 'Not provided'}</dd>
                <dt>Priority</dt><dd>{selectedReport.priority}</dd>
                <dt>Status</dt><dd>{selectedReport.status}</dd>
                <dt>Latitude</dt><dd>{selectedReport.latitude}</dd>
                <dt>Longitude</dt><dd>{selectedReport.longitude}</dd>
              </dl>
            </Modal.Body>
          </>
        )}
      </Modal>
    </div>
  )
}