import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { QAConsole } from '@/pages/QAConsole'
import { Trends } from '@/pages/Trends'
import { Report } from '@/pages/Report'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="ask" element={<QAConsole />} />
        <Route path="trends" element={<Trends />} />
        <Route path="report" element={<Report />} />
      </Route>
    </Routes>
  )
}
