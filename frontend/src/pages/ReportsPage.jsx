import { Badge, Button, Card, Col, Container, Form, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'

const sampleReports = [
  {
    id: 1,
    title: 'Flooded road',
    category: 'Drainage & Sanitation',
    status: 'Pending',
    priority: 'High',
  },
  {
    id: 2,
    title: 'Broken streetlight',
    category: 'Electrical & Utilities',
    status: 'In review',
    priority: 'Medium',
  },
  {
    id: 3,
    title: 'Large pothole',
    category: 'Road & Transport',
    status: 'Resolved',
    priority: 'Low',
  },
]

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
            <Form.Control type="text" placeholder="Search reports..." className="search-box" />
          </Col>
          <Col md={3}>
            <Form.Select>
              <option>All categories</option>
              <option>Road & Transport</option>
              <option>Drainage & Sanitation</option>
              <option>Electrical & Utilities</option>
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Select>
              <option>All statuses</option>
              <option>Pending</option>
              <option>In review</option>
              <option>Resolved</option>
            </Form.Select>
          </Col>
        </Row>

        <Row className="g-3">
          {sampleReports.map((report) => (
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
                    <Button variant="outline-light" size="sm">
                      View details
                    </Button>
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
