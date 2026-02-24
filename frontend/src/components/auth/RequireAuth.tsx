import { Navigate, Outlet } from 'react-router-dom'
import { useGetMeQuery } from '@/store/api'

export function RequireAuth() {
  const { data: me, isLoading } = useGetMeQuery()

  if (isLoading) return null
  if (me) return <Outlet />
  return <Navigate to="/login" replace />
}
