import { useState } from 'react'
import { Button, Col, Container, Form, Navbar, Row } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'

export default function ReportPage() {
  const [details, setDetails] = useState({
    title: '',
    category: '',
    hazard_type: '',
    priority: '',
    description: '',
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [analysisError, setAnalysisError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handlePhotoChange(event) {
    const image = event.target.files[0]
    if (!image) return

    const formData = new FormData()
    formData.append('image', image)
    setIsAnalyzing(true)
    setAnalysisMessage('')
    setAnalysisError('')

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Image analysis failed.')
      }

      setDetails({
        title: result.title,
        category: result.category,
        hazard_type: result.hazard_type,
        priority: result.priority,
        description: result.description,
      })
      setAnalysisMessage('Suggestions added. You can edit any field.')
    } catch (error) {
      setAnalysisError(error.message || 'Image analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleDetailChange(event) {
    const { name, value } = event.target
    setDetails((currentDetails) => ({ ...currentDetails, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        body: new FormData(event.currentTarget),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Could not save the report.')
      }
      navigate('/reports')
    } catch (error) {
      setSubmitError(error.message || 'Could not save the report. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
            Upload a photo to get a first draft of the report details.
          </p>

          <Form className="report-form" onSubmit={handleSubmit}>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Upload photo</Form.Label>
                  <Form.Control
                    type="file"
                    name="image"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                  />
                </Form.Group>
                {isAnalyzing && <p className="text-info small mt-2 mb-0">Analyzing photo...</p>}
                {analysisMessage && <p className="text-success small mt-2 mb-0" role="status">{analysisMessage}</p>}
                {analysisError && <p className="text-danger small mt-2 mb-0" role="alert">{analysisError}</p>}
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Title</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    placeholder="Broken streetlight"
                    value={details.title}
                    onChange={handleDetailChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select name="category" value={details.category} onChange={handleDetailChange} required>
                    <option value="">Select a category</option>
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
                  <Form.Control
                    type="text"
                    name="hazard_type"
                    placeholder="Pothole, flood, fire..."
                    value={details.hazard_type}
                    onChange={handleDetailChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Priority</Form.Label>
                  <Form.Select name="priority" value={details.priority} onChange={handleDetailChange} required>
                    <option value="">Select a priority</option>
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
                    value={details.description}
                    onChange={handleDetailChange}
                    required
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
                  <Form.Control type="number" step="any" name="latitude" placeholder="1.2903" required />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Longitude</Form.Label>
                  <Form.Control type="number" step="any" name="longitude" placeholder="103.8519" required />
                </Form.Group>
              </Col>

            </Row>

            {submitError && <p className="text-danger mt-3 mb-0" role="alert">{submitError}</p>}

            <div className="form-actions">
              <Button variant="outline-light" type="button">
                Cancel
              </Button>
              <Button variant="success" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Submit report'}
              </Button>
            </div>
          </Form>
        </div>
      </Container>
    </div>
  )
}
