import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'leaflet/dist/leaflet.css'
import './App.css'
import HomePage from './pages/HomePage'
import HazardsPage from './pages/HazardsPage'
import ReportPage from './pages/ReportPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/hazards" element={<HazardsPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/reports" element={<Navigate to="/hazards" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
