import { Button, Col, Container, Form, Navbar, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'

export default function ReportPage() {
  return (
    <div className="page-shell" data-bs-theme="dark">
      <Navbar className="topbar">
        <Container fluid className="topbar-inner">
          <Navbar.Brand className="brand">HazardWatch</Navbar.Brand>

          <div className="topbar-actions">
            <Link to="/">
              <Button variant="outline-light">Back to map</Button>
            </Link>
          </div>
        </Container>
      </Navbar>

      <Container className="py-4">
        <div className="report-card">
          <h2 className="page-title">Report a hazard</h2>
          <p className="text-muted">
            Add the details below. This is the form layout for the next step.
          </p>

          <Form className="report-form">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Title</Form.Label>
                  <Form.Control type="text" name="title" placeholder="Broken streetlight" />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select name="category">
                    <option>Road & Transport</option>
                    <option>Drainage & Sanitation</option>
                    <option>Electrical & Utilities</option>
                    <option>Public Infrastructure</option>
                    <option>Environmental</option>
                    <option>Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Hazard type</Form.Label>
                  <Form.Control type="text" name="hazard_type" placeholder="Pothole, flood, fire..." />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Priority</Form.Label>
                  <Form.Select name="priority">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="description"
                    placeholder="Describe what is happening..."
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Location</Form.Label>
                  <Form.Control type="text" name="location" placeholder="Main Road, near bus stop" />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status">
                    <option>Pending</option>
                    <option>In review</option>
                    <option>Resolved</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Latitude</Form.Label>
                  <Form.Control type="number" step="any" name="latitude" placeholder="1.2903" />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Longitude</Form.Label>
                  <Form.Control type="number" step="any" name="longitude" placeholder="103.8519" />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Upload photo</Form.Label>
                  <Form.Control type="file" name="image" />
                </Form.Group>
              </Col>
            </Row>

            <div className="form-actions">
              <Button variant="outline-light" type="button">
                Cancel
              </Button>
              <Button variant="success" type="submit">
                Submit report
              </Button>
            </div>
          </Form>
        </div>
      </Container>
    </div>
  )
}
