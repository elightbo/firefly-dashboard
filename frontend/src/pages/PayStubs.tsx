import { useState } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useGetMeQuery,
  useGetPayStubsQuery,
  useCreatePayStubMutation,
  useUpdatePayStubMutation,
  useDeletePayStubMutation,
  useGetPayStubSummaryQuery,
} from '@/store/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtPct = (n: number) => `${n.toFixed(1)}%`

interface FormState {
  payDate: string
  employer: string
  gross: string
  retirement: string
  employerMatch: string
  stockOptions: string
  netPay: string
  notes: string
}

const emptyForm: FormState = {
  payDate: '',
  employer: '',
  gross: '',
  retirement: '0',
  employerMatch: '0',
  stockOptions: '0',
  netPay: '',
  notes: '',
}

export function PayStubs() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)

  const { data: me } = useGetMeQuery()
  const { data: stubs = [], isLoading } = useGetPayStubsQuery()
  const { data: summary } = useGetPayStubSummaryQuery('year_to_date')
  const [createPayStub, { isLoading: saving }] = useCreatePayStubMutation()
  const [updatePayStub, { isLoading: updating }] = useUpdatePayStubMutation()
  const [deletePayStub] = useDeletePayStubMutation()

  function handleChange(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleEditChange(field: keyof FormState, value: string) {
    setEditForm((f) => ({ ...f, [field]: value }))
  }

  function startEdit(stub: import('@/types').PayStub) {
    setEditingId(stub.id)
    setEditForm({
      payDate: stub.payDate,
      employer: stub.employer,
      gross: String(stub.gross),
      retirement: String(stub.retirement),
      employerMatch: String(stub.employerMatch),
      stockOptions: String(stub.stockOptions),
      netPay: stub.netPay != null ? String(stub.netPay) : '',
      notes: stub.notes ?? '',
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createPayStub({
      payDate: form.payDate,
      employer: form.employer,
      gross: parseFloat(form.gross) || 0,
      retirement: parseFloat(form.retirement) || 0,
      employerMatch: parseFloat(form.employerMatch) || 0,
      stockOptions: parseFloat(form.stockOptions) || 0,
      netPay: form.netPay ? parseFloat(form.netPay) : null,
      notes: form.notes || null,
    })
    setForm(emptyForm)
    setShowForm(false)
  }

  async function handleUpdate(id: number) {
    await updatePayStub({
      id,
      payDate: editForm.payDate,
      employer: editForm.employer,
      gross: parseFloat(editForm.gross) || 0,
      retirement: parseFloat(editForm.retirement) || 0,
      employerMatch: parseFloat(editForm.employerMatch) || 0,
      stockOptions: parseFloat(editForm.stockOptions) || 0,
      netPay: editForm.netPay ? parseFloat(editForm.netPay) : null,
      notes: editForm.notes || null,
    })
    setEditingId(null)
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this pay stub?')) return
    await deletePayStub(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pay Stubs</h1>
        <Button onClick={() => setShowForm((s) => !s)} variant={showForm ? 'outline' : 'default'}>
          {showForm ? 'Cancel' : 'Add Pay Stub'}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">YTD Gross Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary ? fmt(summary.grossIncome) : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">YTD Pre-tax Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary ? fmt(summary.preTaxSavings) : '—'}</p>
            {summary && (
              <p className="text-xs text-muted-foreground mt-1">
                Retirement {fmt(summary.retirementContributions)} · Match {fmt(summary.employerMatch)} · Stock {fmt(summary.stockOptions)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pre-tax Savings Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary ? fmtPct(summary.preTaxSavingsRate) : '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Pay Stub</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="payDate">Pay Date</Label>
                <Input
                  id="payDate"
                  type="date"
                  required
                  value={form.payDate}
                  onChange={(e) => handleChange('payDate', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="employer">Employer</Label>
                <Input
                  id="employer"
                  required
                  placeholder="Acme Corp"
                  value={form.employer}
                  onChange={(e) => handleChange('employer', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gross">Gross ($)</Label>
                <Input
                  id="gross"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={form.gross}
                  onChange={(e) => handleChange('gross', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="retirement">Retirement ($)</Label>
                <Input
                  id="retirement"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.retirement}
                  onChange={(e) => handleChange('retirement', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="employerMatch">Employer Match ($)</Label>
                <Input
                  id="employerMatch"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.employerMatch}
                  onChange={(e) => handleChange('employerMatch', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stockOptions">Stock Options / ESPP ($)</Label>
                <Input
                  id="stockOptions"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.stockOptions}
                  onChange={(e) => handleChange('stockOptions', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="netPay">Net Pay ($)</Label>
                <Input
                  id="netPay"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.netPay}
                  onChange={(e) => handleChange('netPay', e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="e.g. bi-weekly pay, includes bonus"
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm) }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* History table */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : stubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pay stubs yet. Add your first stub above to start tracking your true savings rate.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Employer</th>
                    <th className="pb-2 font-medium text-right">Gross</th>
                    <th className="pb-2 font-medium text-right">Retirement</th>
                    <th className="pb-2 font-medium text-right">Match</th>
                    <th className="pb-2 font-medium text-right">Stock</th>
                    <th className="pb-2 font-medium text-right">Net Pay</th>
                    <th className="pb-2 font-medium text-right">Pre-tax %</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {stubs.map((stub) => {
                    const isOwn = me?.id === stub.userId
                    const isEditing = editingId === stub.id

                    if (isEditing) {
                      return (
                        <tr key={stub.id} className="border-b last:border-0 bg-muted/30">
                          <td className="py-1"><Input type="date" className="h-7 text-xs" value={editForm.payDate} onChange={(e) => handleEditChange('payDate', e.target.value)} /></td>
                          <td className="py-1"><Input className="h-7 text-xs" value={editForm.employer} onChange={(e) => handleEditChange('employer', e.target.value)} /></td>
                          <td className="py-1"><Input type="number" step="0.01" className="h-7 text-xs text-right" value={editForm.gross} onChange={(e) => handleEditChange('gross', e.target.value)} /></td>
                          <td className="py-1"><Input type="number" step="0.01" className="h-7 text-xs text-right" value={editForm.retirement} onChange={(e) => handleEditChange('retirement', e.target.value)} /></td>
                          <td className="py-1"><Input type="number" step="0.01" className="h-7 text-xs text-right" value={editForm.employerMatch} onChange={(e) => handleEditChange('employerMatch', e.target.value)} /></td>
                          <td className="py-1"><Input type="number" step="0.01" className="h-7 text-xs text-right" value={editForm.stockOptions} onChange={(e) => handleEditChange('stockOptions', e.target.value)} /></td>
                          <td className="py-1"><Input type="number" step="0.01" className="h-7 text-xs text-right" placeholder="—" value={editForm.netPay} onChange={(e) => handleEditChange('netPay', e.target.value)} /></td>
                          <td className="py-1 text-right text-muted-foreground text-xs">—</td>
                          <td className="py-1 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleUpdate(stub.id)} disabled={updating} className="text-muted-foreground hover:text-green-600 transition-colors" title="Save"><Check className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground transition-colors" title="Cancel"><X className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    const preTax = stub.retirement + stub.employerMatch + stub.stockOptions
                    const rate = stub.gross > 0 ? (preTax / stub.gross) * 100 : 0
                    return (
                      <tr key={stub.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2">{stub.payDate}</td>
                        <td className="py-2">{stub.employer}</td>
                        <td className="py-2 text-right">{fmt(stub.gross)}</td>
                        <td className="py-2 text-right">{fmt(stub.retirement)}</td>
                        <td className="py-2 text-right">{fmt(stub.employerMatch)}</td>
                        <td className="py-2 text-right">{fmt(stub.stockOptions)}</td>
                        <td className="py-2 text-right">{stub.netPay != null ? fmt(stub.netPay) : '—'}</td>
                        <td className="py-2 text-right">{fmtPct(rate)}</td>
                        <td className="py-2 text-right">
                          {isOwn && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => startEdit(stub)} className="text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(stub.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          )}
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
    </div>
  )
}
