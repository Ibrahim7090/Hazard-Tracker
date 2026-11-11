import { useEffect, useState } from 'react'
import { Badge, Button, Card, Col, Container, Form, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'

function priorityVariant(priority) {
  if (priority === 'High') {
    return 'danger'
  }
  if (priority === 'Medium') {
    return 'warning'
  }
  return 'primary'
}

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadReports() {
      try {
        const response = await fetch('/api/reports')
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Could not load reports.')
        }
        setReports(result)
      } catch (loadError) {
        setError(loadError.message || 'Could not load reports.')
      }
    }

    loadReports()
  }, [])

  const visibleReports = reports.filter((report) => {
    const matchesSearch = report.title.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (!category || report.category === category) && (!status || report.status === status)
  })

  return (
    <div className="page-shell" data-bs-theme="dark">
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="page-title">Reports</h2>
            <p className="text-muted mb-0">Search and review hazards submitted by the public.</p>
          </div>

          <Link to="/report">
            <Button variant="success">New report</Button>
          </Link>
        </div>

        <Row className="mb-4">
          <Col md={6}>
            <Form.Control
              type="text"
              placeholder="Search reports..."
              className="search-box"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Col>
          <Col md={3}>
            <Form.Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              <option>Road &amp; Transport</option>
              <option>Drainage &amp; Sanitation</option>
              <option>Electrical &amp; Utilities</option>
              <option>Public Infrastructure</option>
              <option>Environmental</option>
              <option>Other</option>
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option>Pending</option>
              <option>In review</option>
              <option>Resolved</option>
            </Form.Select>
          </Col>
        </Row>

        <Row className="g-3">
          {error && <Col xs={12}><p className="text-danger" role="alert">{error}</p></Col>}
          {!error && visibleReports.length === 0 && (
            <Col xs={12}><p className="text-muted">No reports found.</p></Col>
          )}
          {visibleReports.map((report) => (
            <Col key={report.id} md={6} lg={4}>
              <Card className="report-card-item">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <Card.Title className="mb-0">{report.title}</Card.Title>
                    <Badge bg={priorityVariant(report.priority)}>{report.priority}</Badge>
                  </div>

                  <p className="text-muted small mb-2">{report.category}</p>

                  <div className="d-flex justify-content-between align-items-center">
                    <Badge bg="secondary">{report.status}</Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  )
}
