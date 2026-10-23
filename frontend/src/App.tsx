import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { LabPage } from './pages/LabPage'
import { ProgressPage } from './pages/ProgressPage'

// A fresh LabPage per lab: mode, tab and widget state must never leak from one lab into the next.
function LabRoute() {
  const { id } = useParams()
  return <LabPage key={id} />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="labs/:id" element={<LabRoute />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
