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

function dangerVariant(dangerLevel) {
  if (dangerLevel === 'High') {
    return 'danger'
  }
  if (dangerLevel === 'Moderate') {
    return 'warning'
  }
  return 'success'
}

function ReportCard({ report, onDeleted }) {
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
        throw new Error(result.error || 'Could not delete the report.')
      }
      onDeleted(report.id)
    } catch (error) {
      setDeleteError(error.message || 'Could not delete the report.')
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

        <p className="text-muted small mb-2">{report.category}</p>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <Badge bg="secondary">{report.status}</Badge>
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
            {summary.summary} <Badge bg={dangerVariant(summary.danger_level)}>{summary.danger_level} danger</Badge>
          </p>
        )}
        {summaryError && <p className="text-danger small mt-2 mb-0" role="alert">{summaryError}</p>}
        {deleteError && <p className="text-danger small mt-2 mb-0" role="alert">{deleteError}</p>}
      </Card.Body>
    </Card>
  )
}

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  function handleDeleted(reportId) {
    setReports((currentReports) => currentReports.filter((report) => report.id !== reportId))
  }

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
              <ReportCard report={report} onDeleted={handleDeleted} />
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  )
}
