import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus, Eye } from "lucide-react";
import DataTable from "./DataTable";
import OrderForm from "./OrderForm";
import WholesaleOrderForm from "./WholesaleOrderForm";
import OrderDetail from "./OrderDetail";
import { toast } from "sonner";

export default function ClientOrdersPanel({ clientId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showWholesaleForm, setShowWholesaleForm] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [clients, setClients] = useState([]);
  const [showDetail, setShowDetail] = useState(false);

  const loadOrders = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await base44.entities.Order.filter({ client_id: clientId }, '-created_date', 500);
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      setOrders([]);
      toast.error("加载订单失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadOrders();
    }
  }, [clientId]);

  useEffect(() => {
    const loadClients = async () => {
      const data = await base44.entities.Client.list('-created_date', 200);
      setClients(data);
    };
    loadClients();
  }, []);

  const columns = [
    { key: "order_number", label: "订单号", width: "120px" },
    { key: "order_type", label: "类型", width: "80px" },
    { key: "total_price", label: "总价", width: "100px", render: (v) => `$${(v || 0).toFixed(2)}` },
    { key: "amount_paid", label: "已付", width: "100px", render: (v) => `$${(v || 0).toFixed(2)}` },
    { key: "balance", label: "未付", width: "100px", render: (v) => `$${(v || 0).toFixed(2)}` },
    { key: "status", label: "状态", width: "100px" },
    { key: "order_date", label: "下单日期", width: "120px" },
  ];

  const handleNew = () => {
    setEditOrder(null);
    setShowForm(true);
  };

  const handleEdit = () => {
    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) { toast.error("请先选择一个订单"); return; }
    setEditOrder(order);
    if (order.order_type === "批发单") {
      setShowWholesaleForm(true);
    } else {
      setShowForm(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrderId) { toast.error("请先选择一个订单"); return; }
    try {
      await base44.entities.Order.delete(selectedOrderId);
      toast.success("订单已删除");
      setSelectedOrderId(null);
      loadOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("删除订单失败，请重试");
    }
  };

  const handleViewDetail = () => {
    if (!selectedOrderId) { toast.error("请先选择一个订单"); return; }
    setShowDetail(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">订单列表</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleNew} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> 新订单
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewDetail} disabled={!selectedOrderId} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> 详情
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit} disabled={!selectedOrderId} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> 编辑
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={!selectedOrderId} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> 删除
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-3 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">暂无订单</div>
      ) : (
        <DataTable 
          columns={columns} 
          data={orders}
          selectedId={selectedOrderId}
          onRowClick={(row) => setSelectedOrderId(row.id === selectedOrderId ? null : row.id)}
        />
      )}

      <OrderForm 
        open={showForm} 
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditOrder(null); }}
        orderType={editOrder?.order_type || "定制单"}
        clients={clients}
        initialOrder={editOrder}
        onSaved={() => { setShowForm(false); setEditOrder(null); loadOrders(); }}
      />

      <WholesaleOrderForm
        open={showWholesaleForm}
        onOpenChange={(open) => { setShowWholesaleForm(open); if (!open) setEditOrder(null); }}
        clients={clients}
        initialOrder={editOrder}
        onSaved={() => { setShowWholesaleForm(false); setEditOrder(null); loadOrders(); }}
      />

      <OrderDetail 
        open={showDetail}
        onOpenChange={setShowDetail}
        order={selectedOrderId ? orders.find(o => o.id === selectedOrderId) : null}
        onUpdated={loadOrders}
      />
    </div>
  );
}