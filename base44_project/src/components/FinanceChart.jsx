import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FinanceChart() {
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [chartType, setChartType] = useState("bar");

  useEffect(() => {
    (async () => {
      const [o, e] = await Promise.all([
        base44.entities.Order.list('-order_date', 2000),
        base44.entities.Expense.list('-expense_date', 2000)
      ]);
      setOrders(o);
      setExpenses(e);
      setLoading(false);
    })();
  }, []);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const data = months.map((name, mi) => {
    const m = String(mi + 1).padStart(2, '0');
    const income = orders
      .filter(o => (o.order_date || o.created_date || "").startsWith(`${year}-${m}`))
      .reduce((s, o) => s + (o.amount_paid || 0), 0);
    const expense = expenses
      .filter(e => (e.expense_date || e.created_date || "").startsWith(`${year}-${m}`))
      .reduce((s, e) => s + (e.amount || 0), 0);
    return { name, 收入: +income.toFixed(2), 支出: +expense.toFixed(2), 净利润: +(income - expense).toFixed(2) };
  });

  const totalIncome = data.reduce((s, d) => s + d.收入, 0);
  const totalExpense = data.reduce((s, d) => s + d.支出, 0);
  const yearList = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  if (loading) return <div className="text-center py-20 text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{yearList.map(y => <SelectItem key={y} value={y}>{y}年</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-2">
          {[["bar","柱状图"],["line","折线图"]].map(([v,l]) => (
            <button key={v} onClick={() => setChartType(v)}
              className={`px-3 py-1.5 rounded text-sm font-medium border transition ${chartType===v ? "bg-primary text-white border-primary" : "bg-white border-gray-300 hover:bg-gray-50"}`}
            >{l}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-6 text-sm">
          <span>年收入: <strong className="text-green-600">${totalIncome.toFixed(2)}</strong></span>
          <span>年支出: <strong className="text-red-600">${totalExpense.toFixed(2)}</strong></span>
          <span>净利润: <strong className={totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-red-600"}>${(totalIncome - totalExpense).toFixed(2)}</strong></span>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-4 text-gray-700">{year}年 月度收支对比</h3>
        <ResponsiveContainer width="100%" height={320}>
          {chartType === "bar" ? (
            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => `$${v.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="收入" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="支出" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="净利润" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => `$${v.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="收入" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="支出" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="净利润" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Monthly summary table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-primary text-white">
            <th className="px-4 py-2 text-left">月份</th>
            <th className="px-4 py-2 text-right">收入</th>
            <th className="px-4 py-2 text-right">支出</th>
            <th className="px-4 py-2 text-right">净利润</th>
          </tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.name} className={i%2===0?"bg-white":"bg-gray-50"}>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 text-right text-green-600">${row.收入.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-red-600">${row.支出.toFixed(2)}</td>
                <td className={`px-4 py-2 text-right font-medium ${row.净利润>=0?"text-blue-600":"text-red-600"}`}>${row.净利润.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-gray-100 font-bold">
            <td className="px-4 py-2">合计</td>
            <td className="px-4 py-2 text-right text-green-600">${totalIncome.toFixed(2)}</td>
            <td className="px-4 py-2 text-right text-red-600">${totalExpense.toFixed(2)}</td>
            <td className={`px-4 py-2 text-right ${totalIncome-totalExpense>=0?"text-blue-600":"text-red-600"}`}>${(totalIncome-totalExpense).toFixed(2)}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}