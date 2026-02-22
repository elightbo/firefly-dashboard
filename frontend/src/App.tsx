import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { QAConsole } from '@/pages/QAConsole'
import { Trends } from '@/pages/Trends'
import { Report } from '@/pages/Report'
import { Settings } from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="ask" element={<QAConsole />} />
          <Route path="trends" element={<Trends />} />
          <Route path="report" element={<Report />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}
