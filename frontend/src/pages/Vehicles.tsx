import { useState } from 'react'
import { Trash2, Pencil, Check, X, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  useGetVehiclesQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
  useGetVehicleSpendingQuery,
  useGetVehicleMonthlySpendingQuery,
} from '@/store/api'
import type { Period, Vehicle } from '@/types'

const VEHICLE_COLORS = ['#6366f1', '#f97316', '#14b8a6', '#ec4899', '#eab308', '#0ea5e9']

const MONTH_OPTIONS = [6, 12, 24]

function monthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function fmtDollar(v: number) {
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'year_to_date', label: 'YTD' },
  { value: 'last_90_days', label: '90d' },
  { value: 'last_30_days', label: '30d' },
  { value: 'year', label: '1yr' },
]

interface VehicleFormState {
  year: string
  make: string
  model: string
  tags: string   // comma-separated
  mileageStart: string
  mileage: string
  notes: string
}

const emptyForm: VehicleFormState = { year: '', make: '', model: '', tags: '', mileageStart: '', mileage: '', notes: '' }

function vehicleToForm(v: Vehicle): VehicleFormState {
  return {
    year: String(v.year),
    make: v.make,
    model: v.model,
    tags: v.tags.join(', '),
    mileageStart: v.mileageStart != null ? String(v.mileageStart) : '',
    mileage: v.mileage != null ? String(v.mileage) : '',
    notes: v.notes ?? '',
  }
}

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

// Monthly comparison bar chart
function VehicleComparisonChart() {
  const [months, setMonths] = useState(12)
  const { data, isLoading } = useGetVehicleMonthlySpendingQuery(months)

  const chartData = data?.months.map(m => {
    const point: Record<string, string | number> = { month: monthLabel(m) }
    data.series.forEach(s => { point[s.label] = s.monthly[m] ?? 0 })
    return point
  }) ?? []

  const hasData = data && data.series.length > 0 &&
    data.series.some(s => Object.values(s.monthly).some(v => v > 0))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Monthly Cost by Vehicle
          </CardTitle>
          <div className="flex gap-1">
            {MONTH_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-md transition-colors',
                  months === m
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {m}mo
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !hasData ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No spending data yet — add vehicles with tags and run a sync.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis
                tickFormatter={fmtDollar}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                width={64}
              />
              <RechartsTooltip
                formatter={(value: number | undefined) => value != null ? fmtDollar(value) : ''}
                contentStyle={{
                  fontSize: 12,
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 6,
                  color: 'hsl(var(--popover-foreground))',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {data!.series.map((s, i) => (
                <Bar
                  key={s.vehicleId}
                  dataKey={s.label}
                  fill={VEHICLE_COLORS[i % VEHICLE_COLORS.length]}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// Per-vehicle spending card with collapsible transaction list
function VehicleSpendingCard({ vehicle, period }: { vehicle: Vehicle; period: Period }) {
  const [expanded, setExpanded] = useState(false)
  const { data, isLoading } = useGetVehicleSpendingQuery({ vehicleId: vehicle.id, period })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-4">
              <span className="text-2xl font-bold">{fmt(data.total)}</span>
              {data.costPerMile != null && (
                <span className="text-sm text-muted-foreground">
                  ${data.costPerMile.toFixed(2)} / mile tracked
                </span>
              )}
            </div>
            {data.transactions.length > 0 && (
              <div>
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {data.transactions.length} transaction{data.transactions.length !== 1 ? 's' : ''}
                </button>
                {expanded && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground text-left">
                          <th className="pb-1 font-medium">Date</th>
                          <th className="pb-1 font-medium">Description</th>
                          <th className="pb-1 font-medium">Tags</th>
                          <th className="pb-1 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.transactions.map(tx => (
                          <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-1 pr-3 whitespace-nowrap">{tx.date}</td>
                            <td className="py-1 pr-3">
                              <div className="flex items-center gap-1">
                                <span>{tx.description ?? '—'}</span>
                                {tx.notes && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-default shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      {tx.notes}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                            <td className="py-1 pr-3">
                              <div className="flex flex-wrap gap-1">
                                {tx.tags.map(t => (
                                  <Badge key={t} variant="secondary" className="text-xs px-1 py-0">{t}</Badge>
                                ))}
                              </div>
                            </td>
                            <td className="py-1 text-right">{fmt(tx.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {data.transactions.length === 0 && (
              <p className="text-xs text-muted-foreground">No transactions for this period.</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function Vehicles() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<VehicleFormState>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<VehicleFormState>(emptyForm)
  const [period, setPeriod] = useState<Period>('year_to_date')

  const { data: vehicles = [], isLoading } = useGetVehiclesQuery()
  const [createVehicle, { isLoading: saving }] = useCreateVehicleMutation()
  const [updateVehicle, { isLoading: updating }] = useUpdateVehicleMutation()
  const [deleteVehicle] = useDeleteVehicleMutation()

  function handleChange(field: keyof VehicleFormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleEditChange(field: keyof VehicleFormState, value: string) {
    setEditForm(f => ({ ...f, [field]: value }))
  }

  function startEdit(v: Vehicle) {
    setEditingId(v.id)
    setEditForm(vehicleToForm(v))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const mileageStart = form.mileageStart ? parseInt(form.mileageStart, 10) : null
    const mileage = form.mileage ? parseInt(form.mileage, 10) : null
    await createVehicle({
      year: parseInt(form.year, 10),
      make: form.make,
      model: form.model,
      tags: parseTags(form.tags),
      mileageStart,
      mileage,
      notes: form.notes || null,
    })
    setForm(emptyForm)
    setShowForm(false)
  }

  async function handleUpdate(id: number) {
    await updateVehicle({
      id,
      year: parseInt(editForm.year, 10),
      make: editForm.make,
      model: editForm.model,
      tags: parseTags(editForm.tags),
      mileageStart: editForm.mileageStart ? parseInt(editForm.mileageStart, 10) : null,
      mileage: editForm.mileage ? parseInt(editForm.mileage, 10) : null,
      notes: editForm.notes || null,
    })
    setEditingId(null)
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this vehicle?')) return
    await deleteVehicle(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Garage</h1>
        <Button onClick={() => setShowForm(s => !s)} variant={showForm ? 'outline' : 'default'}>
          {showForm ? 'Cancel' : 'Add Vehicle'}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year" type="number" required min="1900" max="2100"
                  placeholder="2019"
                  value={form.year}
                  onChange={e => handleChange('year', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make" required placeholder="Ford"
                  value={form.make}
                  onChange={e => handleChange('make', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model" required placeholder="Fiesta ST"
                  value={form.model}
                  onChange={e => handleChange('model', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tags">Firefly Tags (comma-separated)</Label>
                <Input
                  id="tags" placeholder="fiestast, fordfiesta"
                  value={form.tags}
                  onChange={e => handleChange('tags', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mileageStart">Starting Odometer</Label>
                <Input
                  id="mileageStart" type="number" min="0" placeholder="200000"
                  value={form.mileageStart}
                  onChange={e => handleChange('mileageStart', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mileage">Current Odometer</Label>
                <Input
                  id="mileage" type="number" min="0" placeholder="205000"
                  value={form.mileage}
                  onChange={e => handleChange('mileage', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes" placeholder="e.g. primary commuter"
                  value={form.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm) }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Garage table */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vehicles yet. Add your first vehicle above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Year</th>
                    <th className="pb-2 font-medium">Make</th>
                    <th className="pb-2 font-medium">Model</th>
                    <th className="pb-2 font-medium">Tags</th>
                    <th className="pb-2 font-medium text-right">Miles Tracked</th>
                    <th className="pb-2 font-medium">Notes</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => {
                    const isEditing = editingId === v.id
                    if (isEditing) {
                      return (
                        <tr key={v.id} className="border-b last:border-0 bg-muted/30">
                          <td className="py-1"><Input type="number" className="h-7 text-xs w-20" value={editForm.year} onChange={e => handleEditChange('year', e.target.value)} /></td>
                          <td className="py-1"><Input className="h-7 text-xs" value={editForm.make} onChange={e => handleEditChange('make', e.target.value)} /></td>
                          <td className="py-1"><Input className="h-7 text-xs" value={editForm.model} onChange={e => handleEditChange('model', e.target.value)} /></td>
                          <td className="py-1"><Input className="h-7 text-xs" placeholder="tag1, tag2" value={editForm.tags} onChange={e => handleEditChange('tags', e.target.value)} /></td>
                          <td className="py-1">
                            <div className="flex items-center gap-1">
                              <Input type="number" className="h-7 text-xs text-right w-24" placeholder="start" value={editForm.mileageStart} onChange={e => handleEditChange('mileageStart', e.target.value)} />
                              <span className="text-xs text-muted-foreground">→</span>
                              <Input type="number" className="h-7 text-xs text-right w-24" placeholder="now" value={editForm.mileage} onChange={e => handleEditChange('mileage', e.target.value)} />
                            </div>
                          </td>
                          <td className="py-1"><Input className="h-7 text-xs" value={editForm.notes} onChange={e => handleEditChange('notes', e.target.value)} /></td>
                          <td className="py-1 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleUpdate(v.id)} disabled={updating} className="text-muted-foreground hover:text-green-600 transition-colors" title="Save"><Check className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground transition-colors" title="Cancel"><X className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={v.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2">{v.year}</td>
                        <td className="py-2">{v.make}</td>
                        <td className="py-2">{v.model}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {v.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                            {v.tags.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          {v.mileage != null && v.mileageStart != null
                            ? (v.mileage - v.mileageStart).toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-2 text-muted-foreground">{v.notes ?? '—'}</td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => startEdit(v)} className="text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(v.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison chart */}
      {vehicles.length > 0 && <VehicleComparisonChart />}

      {/* Per-vehicle spending breakdown */}
      {vehicles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Spending by Vehicle</h2>
            <div className="flex gap-1">
              {PERIODS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-md transition-colors',
                    period === value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map(v => (
              <VehicleSpendingCard key={v.id} vehicle={v} period={period} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
