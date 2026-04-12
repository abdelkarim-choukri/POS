import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { reportApi } from '../../api/business';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { format, subDays } from 'date-fns';

const TABS = ['Daily Sales', 'By Item', 'Payment Methods', 'Transactions', 'Voids/Refunds', 'Employee Hours'] as const;
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>('Daily Sales');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const params = { start_date: startDate, end_date: endDate };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-end">
        <Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {tab === 'Daily Sales' && <DailySalesTab params={params} />}
      {tab === 'By Item' && <ByItemTab params={params} />}
      {tab === 'Payment Methods' && <PaymentTab params={params} />}
      {tab === 'Transactions' && <TransactionsTab params={params} />}
      {tab === 'Voids/Refunds' && <VoidsRefundsTab params={params} />}
      {tab === 'Employee Hours' && <ClockTab params={params} />}
    </div>
  );
}

function DailySalesTab({ params }: { params: any }) {
  const { data = [] } = useQuery({ queryKey: ['report-daily', params], queryFn: () => reportApi.dailySales(params).then(r => r.data) });
  const chartData = [...data].reverse().map((d: any) => ({ date: format(new Date(d.date), 'MMM dd'), revenue: parseFloat(d.total_revenue) || 0, count: parseInt(d.transaction_count) || 0 }));

  return (
    <Card className="p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">Daily Sales</h2>
        <Button variant="secondary" size="sm" onClick={() => exportCSV(data, 'daily-sales')}><Download size={14} /> Export</Button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="revenue" name="Revenue (MAD)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <table className="w-full text-sm mt-4">
        <thead><tr className="text-left text-gray-500 border-b">
          <th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Transactions</th><th className="pb-2 font-medium">Revenue</th>
        </tr></thead>
        <tbody>
          {data.map((d: any) => (
            <tr key={d.date} className="border-b last:border-0">
              <td className="py-2">{format(new Date(d.date), 'MMM dd, yyyy')}</td>
              <td className="py-2">{d.transaction_count}</td>
              <td className="py-2 font-medium">{parseFloat(d.total_revenue).toFixed(2)} MAD</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function ByItemTab({ params }: { params: any }) {
  const { data = [] } = useQuery({ queryKey: ['report-items', params], queryFn: () => reportApi.revenueByItem(params).then(r => r.data) });
  return (
    <Card className="p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">Revenue by Item</h2>
        <Button variant="secondary" size="sm" onClick={() => exportCSV(data, 'revenue-by-item')}><Download size={14} /> Export</Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 border-b">
          <th className="pb-2 font-medium">Product</th><th className="pb-2 font-medium">Qty Sold</th><th className="pb-2 font-medium">Revenue</th>
        </tr></thead>
        <tbody>
          {data.map((d: any, i: number) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 font-medium">{d.product_name}</td>
              <td className="py-2">{d.total_quantity}</td>
              <td className="py-2">{parseFloat(d.total_revenue).toFixed(2)} MAD</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function PaymentTab({ params }: { params: any }) {
  const { data = [] } = useQuery({ queryKey: ['report-payments', params], queryFn: () => reportApi.paymentMethods(params).then(r => r.data) });
  const pieData = data.map((d: any) => ({ name: d.payment_method?.replace('_', ' '), value: parseFloat(d.total) || 0, count: parseInt(d.count) }));

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-4">Payment Methods</h2>
      {pieData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {pieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: any) => `${v} MAD`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function TransactionsTab({ params }: { params: any }) {
  const [page, setPage] = useState(1);
  const { data } = useQuery({ queryKey: ['report-txns', params, page], queryFn: () => reportApi.transactions({ ...params, page, limit: 20 }).then(r => r.data) });
  const txns = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-4">Transaction History</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 border-b">
          <th className="pb-2 font-medium">Number</th><th className="pb-2 font-medium">Amount</th><th className="pb-2 font-medium">Payment</th>
          <th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Employee</th><th className="pb-2 font-medium">Date</th>
        </tr></thead>
        <tbody>
          {txns.map((t: any) => (
            <tr key={t.id} className="border-b last:border-0">
              <td className="py-2 font-medium">{t.transaction_number}</td>
              <td className="py-2">{parseFloat(t.total).toFixed(2)} MAD</td>
              <td className="py-2 capitalize">{t.payment_method?.replace('_', ' ')}</td>
              <td className="py-2"><Badge color={t.status === 'completed' ? 'green' : t.status === 'voided' ? 'red' : 'yellow'}>{t.status}</Badge></td>
              <td className="py-2">{t.user ? `${t.user.first_name} ${t.user.last_name}` : '—'}</td>
              <td className="py-2 text-gray-500">{format(new Date(t.created_at), 'MMM dd, HH:mm')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-500 py-1.5">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </Card>
  );
}

function VoidsRefundsTab({ params }: { params: any }) {
  const { data } = useQuery({ queryKey: ['report-voids', params], queryFn: () => reportApi.voidsRefunds(params).then(r => r.data) });
  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-4">Voids & Refunds</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Voids ({data?.voids?.length || 0})</h3>
          {data?.voids?.length ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2 font-medium">Transaction</th><th className="pb-2 font-medium">Reason</th><th className="pb-2 font-medium">Date</th></tr></thead>
              <tbody>{data.voids.map((v: any) => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="py-2">{v.transaction?.transaction_number}</td><td className="py-2">{v.reason}</td><td className="py-2 text-gray-500">{format(new Date(v.voided_at), 'MMM dd, HH:mm')}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-gray-400">No voids</p>}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Refunds ({data?.refunds?.length || 0})</h3>
          {data?.refunds?.length ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2 font-medium">Transaction</th><th className="pb-2 font-medium">Amount</th><th className="pb-2 font-medium">Reason</th><th className="pb-2 font-medium">Date</th></tr></thead>
              <tbody>{data.refunds.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2">{r.transaction?.transaction_number}</td><td className="py-2">{parseFloat(r.amount).toFixed(2)} MAD</td><td className="py-2">{r.reason}</td><td className="py-2 text-gray-500">{format(new Date(r.refunded_at), 'MMM dd, HH:mm')}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-gray-400">No refunds</p>}
        </div>
      </div>
    </Card>
  );
}

function ClockTab({ params }: { params: any }) {
  const { data = [] } = useQuery({ queryKey: ['report-clock', params], queryFn: () => reportApi.clockHistory(params).then(r => r.data) });
  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-4">Employee Hours</h2>
      {data.length === 0 ? <p className="text-sm text-gray-400">No clock entries</p> : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b">
            <th className="pb-2 font-medium">Employee</th><th className="pb-2 font-medium">Role</th><th className="pb-2 font-medium">Clock In</th><th className="pb-2 font-medium">Clock Out</th><th className="pb-2 font-medium">Hours</th>
          </tr></thead>
          <tbody>
            {data.map((c: any) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-2">{c.user?.first_name} {c.user?.last_name}</td>
                <td className="py-2 capitalize">{c.user?.role}</td>
                <td className="py-2">{format(new Date(c.clock_in), 'MMM dd, HH:mm')}</td>
                <td className="py-2">{c.clock_out ? format(new Date(c.clock_out), 'MMM dd, HH:mm') : <Badge color="green">Active</Badge>}</td>
                <td className="py-2">{c.total_hours ? `${c.total_hours}h` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(d => Object.values(d).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}
