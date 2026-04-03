import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Trash2, Eye } from "lucide-react";
import DataTable from "./DataTable";
import DateRangeSelector from "./DateRangeSelector";
import { toast } from "sonner";
import OrderDetail from "./OrderDetail";

export default function IncomeTab() {
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [methods, setMethods] = useState(["现金", "支票", "转账", "刷卡"]);
  const [selectedId, setSelectedId] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [orders, setOrders] = useState([]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.PaymentRecord.filter({ type: "收款" }, '-created_date', 500);
    setIncome(data);
    setLoading(false);
  };

  useEffect(() => {
    const loadOrders = async () => {
      const o = await base44.entities.Order.list('-created_date', 500);
      setOrders(o);
    };
    loadData();
    loadOrders();
    const unsubscribe = base44.entities.PaymentRecord.subscribe((event) => {
      if (event.type === 'create' || event.type === 'delete' || event.type === 'update') {
        loadData();
      }
    });
    return unsubscribe;
  }, []);

  const filtered = income.filter(i => {
    const matchSearch = !search || i.order_number?.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "全部" || i.detail === typeFilter;
    const matchMethod = !i.payment_method || methods.includes(i.payment_method);
    let matchDate = true;
    if (dateRange) {
      const payDate = i.payment_date;
      matchDate = payDate >= dateRange.startDate && payDate <= dateRange.endDate;
    }
    return matchSearch && matchType && matchMethod && matchDate;
  });

  const totalIncome = filtered.reduce((s, i) => s + (i.amount || 0), 0);

  const columns = [
    { key: "order_number", label: "订单号(Order)", width: "100px" },
    { key: "amount", label: "金额(Amount)", width: "80px", render: (v) => <span className="text-red-600 font-medium">${v?.toFixed(2) || 0}</span> },
    { key: "detail", label: "明细(Detail)", width: "150px" },
    { key: "payment_date", label: "日期(Date)", width: "100px", render: (v) => <span className="text-orange-600 font-medium">{v}</span> },
    { key: "description", label: "备注(Remark)", width: "150px" },
  ];

  const selectedOrder = selectedId ? orders.find(o => o.id === income.find(i => i.id === selectedId)?.order_id) : null;

  const toggleMethod = (m) => {
    setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  return (
    <div className="space-y-4 bg-green-50 dark:bg-green-950 rounded-lg p-4">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm shadow-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="🔍 搜索订单号..." 
              className="pl-8 h-10 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent font-medium" 
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">类型:</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["全部", "定制", "批发"].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">支付方式:</span>
            {["现金", "支票", "转账", "刷卡"].map(m => (
              <div key={m} className="flex items-center gap-1.5">
                <Checkbox 
                  id={`income-${m}`}
                  checked={methods.includes(m)}
                  onCheckedChange={() => toggleMethod(m)}
                />
                <Label htmlFor={`income-${m}`} className="text-sm cursor-pointer">{m}</Label>
              </div>
            ))}
          </div>
        </div>
        </div>

        <DateRangeSelector onDateChange={setDateRange} />

        {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
           <div className="flex gap-2 mb-3">
              <Button size="sm" onClick={() => setShowOrderDetail(true)} disabled={!selectedOrder} className="gap-1"><Eye className="h-3 w-3" /> 查看订单</Button>
            </div>
            <DataTable 
              columns={columns} 
              data={filtered}
              selectedIds={selectedId ? [selectedId] : []}
              onRowClick={(row) => setSelectedId(selectedId === row.id ? null : row.id)}
              emptyText="暂无收入记录"
              headerColor="bg-blue-600"
            />
           <div className="flex justify-end gap-6 p-4 bg-card border border-border rounded-lg">
                 <span className="text-sm text-muted-foreground">
                   总收入: <strong className="text-red-600 text-lg">${totalIncome.toFixed(2)}</strong>
                 </span>
               </div>
        </>
        )}

        {selectedOrder && <OrderDetail open={showOrderDetail} onOpenChange={setShowOrderDetail} order={selectedOrder} onUpdated={loadData} />}
        </div>
        );
        }