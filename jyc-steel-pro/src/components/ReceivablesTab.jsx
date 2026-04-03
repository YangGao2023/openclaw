import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle } from "lucide-react";

export default function ReceivablesTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const data = await base44.entities.Order.list('-order_date', 2000);
      setOrders(data);
      setLoading(false);
    })();
  }, []);

  // Group unpaid orders by client
  const unpaidOrders = orders.filter(o => (o.balance || 0) > 0);
  const filtered = unpaidOrders.filter(o =>
    !search || o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.order_number?.includes(search)
  );

  // Group by client
  const byClient = filtered.reduce((acc, o) => {
    const key = o.client_name || "未知客户";
    if (!acc[key]) acc[key] = { orders: [], totalBalance: 0 };
    acc[key].orders.push(o);
    acc[key].totalBalance += (o.balance || 0);
    return acc;
  }, {});

  const clientList = Object.entries(byClient).sort((a, b) => b[1].totalBalance - a[1].totalBalance);
  const grandTotal = unpaidOrders.reduce((s, o) => s + (o.balance || 0), 0);
  const totalCount = unpaidOrders.length;

  if (loading) return <div className="text-center py-20 text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium">总应收款</div>
          <div className="text-2xl font-bold text-red-700 mt-1">${grandTotal.toFixed(2)}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-sm text-amber-600 font-medium">未付清订单</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{totalCount} 单</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">涉及客户</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{clientList.length} 人</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索客户/订单号..." className="max-w-xs h-9" />
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>

      {clientList.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">🎉 暂无应收款，所有订单已结清！</div>
      ) : (
        <div className="space-y-4">
          {clientList.map(([clientName, { orders: cOrders, totalBalance }]) => (
            <div key={clientName} className="border rounded-lg overflow-hidden">
              <div className="bg-primary text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-semibold">{clientName}</span>
                  <span className="text-xs opacity-80">({cOrders.length} 笔未付清)</span>
                </div>
                <div className="font-bold text-lg">应收: ${totalBalance.toFixed(2)}</div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-blue-50">
                  <th className="px-3 py-2 text-left">订单号</th>
                  <th className="px-3 py-2 text-left">类型</th>
                  <th className="px-3 py-2 text-left">下单日期</th>
                  <th className="px-3 py-2 text-right">总金额</th>
                  <th className="px-3 py-2 text-right">已付</th>
                  <th className="px-3 py-2 text-right font-bold text-red-600">未付</th>
                  <th className="px-3 py-2 text-left">状态</th>
                </tr></thead>
                <tbody>
                  {cOrders.map((o, i) => (
                    <tr key={o.id} className={i%2===0?"bg-white":"bg-gray-50"}>
                      <td className="px-3 py-2 font-medium text-blue-600">{o.order_number}</td>
                      <td className="px-3 py-2">{o.order_type}</td>
                      <td className="px-3 py-2">{o.order_date || "-"}</td>
                      <td className="px-3 py-2 text-right">${(o.total_price||0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-green-600">${(o.amount_paid||0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold text-red-600">${(o.balance||0).toFixed(2)}</td>
                      <td className="px-3 py-2">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}