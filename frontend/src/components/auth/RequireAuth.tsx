import { Navigate, Outlet } from 'react-router-dom'
import { useGetMeQuery } from '@/store/api'

export function RequireAuth() {
  const { data: me, isLoading, isError } = useGetMeQuery()

  if (isLoading) return null
  if (me) return <Outlet />
  if (isError) return <Navigate to="/login" replace />
  return null
}
