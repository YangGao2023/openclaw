import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Eye, Trash2, Edit2, Printer } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import OrderExport from "../components/OrderExport";
import DataTable from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import OrderForm from "../components/OrderForm";
import WholesaleOrderForm from "../components/WholesaleOrderForm";
import OrderDetail from "../components/OrderDetail";
import OrderPrintPreview from "../components/OrderPrintPreview";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [clientFilter, setClientFilter] = useState("全部");
  const [showOnlyBalance, setShowOnlyBalance] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showWholesaleForm, setShowWholesaleForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formType, setFormType] = useState("定制单");
  const [editingOrder, setEditingOrder] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [o, c] = await Promise.all([
      base44.entities.Order.list('-created_date', 500),
      base44.entities.Client.list('-created_date', 200)
    ]);
    setOrders(Array.isArray(o) ? o : []);
    setClients(Array.isArray(c) ? c : []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = orders.filter(o => {
    const ms = !search || o.client_name?.toLowerCase().includes(search.toLowerCase()) || 
      o.order_number?.includes(search) || o.description?.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === "全部" || o.order_type === typeFilter;
    const mst = statusFilter === "全部" || o.status === statusFilter;
    const mc = clientFilter === "全部" || o.client_name === clientFilter;
    const mb = !showOnlyBalance || ((o.balance || 0) > 0 && o.status !== "结清");
    return ms && mt && mst && mc && mb;
  });

  const totalPaid = filtered.reduce((s, o) => s + (o.amount_paid || 0), 0);
  const totalUnpaid = filtered.reduce((s, o) => s + (o.balance || 0), 0);

  const getOverdueInfo = (order) => {
    const bal = order.balance || 0;
    if (bal <= 0 || order.status === "结清") return { isOverdue: false };
    if (order.order_type === "定制单") {
      if (order.installation_status !== "已安装") return { isOverdue: false };
      const ref = order.install_date || order.order_date;
      const days = ref ? Math.floor((new Date() - new Date(ref)) / 86400000) : 0;
      return { isOverdue: days > 0, days };
    } else {
      // 批发单: 已发货 OR 已签收 且 balance > 0 则逐期
      if (order.shipment_status !== "已发货" && order.shipment_status !== "已签收") return { isOverdue: false };
      const ref = order.shipped_date || order.order_date;
      const days = ref ? Math.floor((new Date() - new Date(ref)) / 86400000) : 0;
      return { isOverdue: days > 0, days };
    }
  };

  const columns = [
    { key: "order_number", label: "订单号", width: "80px" },
    { key: "order_type", label: "类型", width: "70px" },
    { key: "client_name", label: "客户", width: "120px" },
    { key: "description", label: "描述", width: "150px", render: (v) => {
      if (!v) return "-";
      const lines = v.split('\n');
      const preview = lines.slice(0, 2).join(' ');
      return preview.length > 30 ? preview.substring(0, 30) + "..." : preview;
    }},
    { key: "item_count", label: "总件数", width: "60px" },
    { key: "total_price", label: "总金额", width: "90px", render: (v) => v ? `$${v.toFixed(2)}` : "$0" },
    { key: "order_date", label: "下单日期", width: "100px" },
    { key: "_logistics", label: "物流状态", width: "90px", render: (_, row) => {
      const val = row.order_type === "定制单" ? row.installation_status : row.shipment_status;
      if (!val) return "-";
      const colorMap = {
        "已安装": "text-green-600", "已签收": "text-green-600",
        "已发货": "text-blue-600", "待安装": "text-orange-500",
        "待发货": "text-orange-500", "生产中": "text-yellow-600",
      };
      return <span className={colorMap[val] || "text-muted-foreground"}>{val}</span>;
    }},
    { key: "status", label: "状态", width: "70px", render: (v) => (
      <span className={
        v === "结清" ? "text-success font-medium" : 
        v === "未付清" ? "text-destructive font-medium" : 
        "text-warning font-medium"
      }>{v}</span>
    )},
    { key: "balance", label: "余款", width: "80px", render: (v, row) => {
      const { isOverdue, days } = getOverdueInfo(row);
      return (
        <span className={isOverdue ? "text-red-600 font-bold" : ""}>
          {v ? `$${v.toFixed(2)}` : "$0"}{isOverdue ? ` (逾${days}天)` : ""}
        </span>
      );
    }},
  ];

  const handleViewDetail = () => {
     if (!selectedId) return;
     setShowDetail(true);
   };

   const handlePrint = () => {
     if (!selectedId) return;
     setShowPrint(true);
   };

   const handleEdit = () => {
      if (!selectedId) return;
      const order = orders.find(o => o.id === selectedId);
      setEditingOrder(order);
      if (order.order_type === "批发单") {
        setShowWholesaleForm(true);
      } else {
        setShowForm(true);
      }
    };

  const handleDeleteConfirm = async () => {
    if (!selectedId) return;
    
    const order = orders.find(o => o.id === selectedId);
    if (!order) return;
    
    // 删除相关的收入记录
    const payments = await base44.entities.PaymentRecord.filter({ order_id: selectedId }, '-created_date', 100);
    for (const p of payments) {
      // 如果是办公室收入，删除对应的现金记录
      if (p.is_office && p.office_cash_id) {
        await base44.entities.CashFlow.delete(p.office_cash_id);
      }
      await base44.entities.PaymentRecord.delete(p.id);
    }
    
    // 删除相关的支出记录
    const expenses = await base44.entities.Expense.filter({ related_order: order.order_number }, '-created_date', 100);
    for (const e of expenses) {
      // 如果是办公室支出，删除对应的现金记录
      if (e.is_office && e.office_cash_id) {
        await base44.entities.CashFlow.delete(e.office_cash_id);
      }
      await base44.entities.Expense.delete(e.id);
    }
    
    // 删除订单
    await base44.entities.Order.delete(selectedId);
    setSelectedId(null);
    setShowDeleteConfirm(false);
    loadData();
    };

    const handleDelete = () => {
    if (!selectedId) return;
    setShowDeleteConfirm(true);
    };

  return (
    <div>
      <PageHeader title="订单管理" subtitle="Order Management">
        <Button variant="outline" size="sm" onClick={handleViewDetail} disabled={!selectedId} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> 查看详情
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!selectedId} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" /> 打印预览
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit} disabled={!selectedId} className="gap-1.5">
            <Edit2 className="h-3.5 w-3.5" /> 编辑
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={!selectedId} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> 删除订单
          </Button>
          <OrderExport orders={filtered} />
        <Button size="sm" onClick={() => { setFormType("定制单"); setShowForm(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> 新建定制单
        </Button>
        <Button size="sm" variant="secondary" onClick={() => { setEditingOrder(null); setShowWholesaleForm(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> 新建批发单
        </Button>
      </PageHeader>

      {/* Balance Due Dashboard */}
      {(() => {
        const overdueOrders = orders.filter(o => {
          if ((o.balance || 0) <= 0 || o.status === "结清") return false;
          if (o.order_type === "定制单") return o.installation_status === "已安装";
          return o.shipment_status === "已发货" || o.shipment_status === "已签收";
        });
        const totalBalanceDue = overdueOrders.reduce((s, o) => s + (o.balance || 0), 0);
        if (overdueOrders.length === 0) return null;
        return (
          <div className="mb-3 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg py-2 px-4 text-sm gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-red-600">⚠️</span>
              <span className="font-semibold text-red-700">未收余款</span>
              <span className="text-red-600 text-xs">{overdueOrders.length} 张订单未结清</span>
            </div>
            <span className="font-bold text-red-600 text-base whitespace-nowrap">${totalBalanceDue.toFixed(2)}</span>
            {showOnlyBalance ? (
              <button
                className="text-xs text-gray-600 border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 whitespace-nowrap"
                onClick={() => setShowOnlyBalance(false)}
              >显示全部</button>
            ) : (
              <button
                className="text-xs text-red-700 border border-red-300 rounded px-2 py-1 hover:bg-red-100 whitespace-nowrap"
                onClick={() => setShowOnlyBalance(true)}
              >仅看未结清</button>
            )}
          </div>
        );
      })()}

      <div className="flex flex-col gap-4 mb-6">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm shadow-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索订单号/客户名称..." className="pl-8 h-10 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium" />
          </div>
        </div>

        {/* Filters & Stats */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">类别:</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                <SelectItem value="定制单">定制单</SelectItem>
                <SelectItem value="批发单">批发单</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">状态:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                <SelectItem value="下单">下单</SelectItem>
                <SelectItem value="结清">结清</SelectItem>
                <SelectItem value="未付清">未付清</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">客户:</span>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">已收款</span>
              <strong className="text-lg text-green-600 font-bold">${totalPaid.toFixed(2)}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">未收款</span>
              <strong className="text-lg text-red-600 font-bold">${totalUnpaid.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} selectedId={selectedId}
          onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)} />
      )}

      <OrderForm 
        open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingOrder(null); }}
        orderType={editingOrder ? editingOrder.order_type : formType} clients={clients}
        initialOrder={editingOrder}
        onSaved={() => { setShowForm(false); setEditingOrder(null); loadData(); }}
      />

      <WholesaleOrderForm
        open={showWholesaleForm} onOpenChange={(open) => { setShowWholesaleForm(open); if (!open) setEditingOrder(null); }}
        clients={clients}
        initialOrder={editingOrder}
        onSaved={() => { setShowWholesaleForm(false); setEditingOrder(null); loadData(); }}
      />

      <OrderDetail 
        open={showDetail} onOpenChange={setShowDetail}
        order={orders.find(o => o.id === selectedId)}
        onUpdated={loadData}
        onPrint={() => { setShowDetail(false); setShowPrint(true); }}
      />

      <OrderPrintPreview
        open={showPrint} onOpenChange={setShowPrint}
        order={orders.find(o => o.id === selectedId)}
        clients={clients}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除订单</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除此订单及所有相关记录（收付款、支出）？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}