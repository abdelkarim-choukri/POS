import { useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingCart, Wifi, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportApi } from '../../api/business';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { format, subDays } from 'date-fns';

export default function DashboardPage() {
  const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const { data: salesData } = useQuery({
    queryKey: ['dailySales'],
    queryFn: () => reportApi.dailySales({ start_date: startDate }),
  });

  const { data: txnData } = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: () => reportApi.transactions({ page: 1, limit: 10 }),
  });

  const { data: paymentData } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => reportApi.paymentMethods({}),
  });

  const sales = salesData?.data || [];
  const todaySales = sales.length > 0 ? sales[0] : null;
  const transactions = txnData?.data?.data || [];
  const payments = paymentData?.data || [];

  const chartData = [...(sales as any[])].reverse().map((d: any) => ({
    date: format(new Date(d.date), 'MMM dd'),
    revenue: parseFloat(d.total_revenue) || 0,
    count: parseInt(d.transaction_count) || 0,
  }));

  const totalRevenue = sales.reduce((sum: number, d: any) => sum + (parseFloat(d.total_revenue) || 0), 0);
  const totalTxns = sales.reduce((sum: number, d: any) => sum + (parseInt(d.transaction_count) || 0), 0);

  const statCards = [
    { label: "Today's Revenue", value: `${todaySales ? parseFloat(todaySales.total_revenue).toFixed(2) : '0.00'} MAD`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: "Today's Transactions", value: todaySales?.transaction_count || '0', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
    { label: '7-Day Revenue', value: `${totalRevenue.toFixed(2)} MAD`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
    { label: '7-Day Transactions', value: totalTxns.toString(), icon: Wifi, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${s.color}`}><s.icon size={22} /></div>
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold mb-4">Revenue — Last 7 Days</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: any) => [`${v} MAD`, 'Revenue']} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold mb-4">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">Transaction</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Payment</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Date</th>
              </tr></thead>
              <tbody>
                {transactions.map((t: any) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{t.transaction_number}</td>
                    <td className="py-3">{parseFloat(t.total).toFixed(2)} MAD</td>
                    <td className="py-3 capitalize">{t.payment_method?.replace('_', ' ')}</td>
                    <td className="py-3">
                      <Badge color={t.status === 'completed' ? 'green' : t.status === 'voided' ? 'red' : 'yellow'}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-500">{format(new Date(t.created_at), 'MMM dd, HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
