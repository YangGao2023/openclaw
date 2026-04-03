import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Users, Plus, Trash2, Printer } from "lucide-react";
import OrderPrintPreview from "./OrderPrintPreview";
import DataTable from "./DataTable";
import ClientSelector from "./ClientSelector";
import MaterialSelector from "./MaterialSelector";


export default function WholesaleOrderForm({ open, onOpenChange, clients, onSaved, initialOrder }) {
  const [form, setForm] = useState({
    client_name: "", phone: "", address: "",
    total_price: 0, deposit: 0, payment_method: "现金",
    is_office: false, discount: 0, order_date: new Date().toISOString().split("T")[0],
    order_items: []
  });
  const [orderNum, setOrderNum] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);




  useEffect(() => {
    if (open) {
      if (initialOrder) {
        setOrderNum(initialOrder.order_number);
        setForm({
          client_name: initialOrder.client_name || "",
          phone: initialOrder.phone || "",
          address: initialOrder.address || "",
          total_price: initialOrder.total_price || 0,
          deposit: initialOrder.deposit || 0,
          payment_method: initialOrder.payment_method || "现金",
          is_office: initialOrder.is_office || false,
          discount: initialOrder.discount || 0,
          order_date: initialOrder.order_date || new Date().toISOString().split("T")[0],
          order_items: initialOrder.order_items || []
        });
      } else {
        generateOrderNumber();
        setForm({
          client_name: "", phone: "", address: "",
          total_price: 0, deposit: 0, payment_method: "现金",
          is_office: false, discount: 0, order_date: new Date().toISOString().split("T")[0],
          order_items: []
        });
      }
    }
  }, [open, initialOrder]);

  const generateOrderNumber = async () => {
    try {
      const res = await base44.functions.invoke('generateOrderNumber', {});
      setOrderNum(res.data.order_number);
    } catch (err) {
      console.error('Failed to generate order number:', err);
    }
  };



  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleAddMaterial = (item) => {
    setForm(p => ({
      ...p,
      order_items: [...p.order_items, item]
    }));
  };

  const handleRemoveMaterial = (idx) => {
    setForm(p => ({
      ...p,
      order_items: p.order_items.filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateQuantity = (idx, newQty) => {
    setForm(p => ({
      ...p,
      order_items: p.order_items.map((item, i) => 
        i === idx ? { ...item, quantity: Number(newQty) || 0 } : item
      )
    }));
  };

  const handleClientSelect = (client) => {
    setForm(p => ({
      ...p, client_name: client.name,
      phone: client.contact || "", address: client.address || ""
    }));
    setClientSearch("");
    setShowClientDropdown(false);
  };

  const handleClientSelectorSelect = (client) => {
    setForm(p => ({
      ...p,
      client_name: client.name,
      phone: client.contact || "",
      address: client.address || "",
      client_id: client.id
    }));
    setClientSearch("");
  };

  // 自动计算总价
  const subtotal = form.order_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const total = Math.max(0, subtotal - form.discount);
  const balance = total - form.deposit;

  const handleSave = async (createNew = false) => {
    if (!form.client_name) { toast.error("客户名必填"); return; }
    if (form.order_items.length === 0) { toast.error("请至少添加一个物料"); return; }

    const client = clients.find(c => c.name === form.client_name);

    if (initialOrder) {
      await base44.entities.Order.update(initialOrder.id, {
        ...form,
        order_type: "批发单",
        total_price: total,
        balance: balance,
        item_count: form.order_items.length,
        status: form.deposit >= total ? "结清" : (form.deposit > 0 ? "未付清" : "下单")
      });
      toast.success("订单已更新");
      onSaved();
      return;
    }

    const createdOrder = await base44.entities.Order.create({
      ...form,
      client_id: client?.id || "",
      order_number: orderNum,
      order_type: "批发单",
      total_price: total,
      balance: balance,
      amount_paid: form.deposit,
      item_count: form.order_items.length,
      status: form.deposit >= total ? "结清" : "下单"
    });

    // 记录收入（定金部分）
    if (form.deposit > 0) {
      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      const paymentRecord = await base44.entities.PaymentRecord.create({
        order_id: createdOrder.id,
        order_number: orderNum,
        type: "收款",
        amount: form.deposit,
        detail: "批发单",
        payment_date: form.order_date,
        payment_method: form.is_office ? "现金" : form.payment_method,
        description: `${form.client_name} - ${form.is_office ? "现金(办公室)" : form.payment_method} (${timeStr})`,
        is_office: form.is_office
      });

      if (form.is_office) {
        await base44.entities.CashFlow.create({
          flow_type: "转入",
          amount: form.deposit,
          flow_date: form.order_date,
          source_type: "订单收入",
          source_id: paymentRecord.id,
          remark: `订单 #${orderNum} - ${form.client_name}`
        });
      }
    }

    toast.success("订单已创建");
    onSaved();
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const columns = [
    { key: "material_code", label: "编号", width: "100px" },
    { key: "material_name", label: "名称", width: "150px" },
    { key: "category", label: "类别", width: "80px" },
    { key: "unit_price", label: "单价", width: "80px", render: (v) => `$${v.toFixed(2)}` },
    {
      key: "quantity",
      label: "数量",
      width: "80px",
      render: (v, row) => (
        <Input
          type="number"
          value={v}
          onChange={(e) => {
            const idx = form.order_items.indexOf(row);
            if (idx >= 0) handleUpdateQuantity(idx, e.target.value);
          }}
          className="w-16 h-6 text-xs"
          min="0"
        />
      )
    },
    {
      key: "id",
      label: "小计",
      width: "80px",
      render: (v, row) => `$${(row.quantity * row.unit_price).toFixed(2)}`
    },
    {
      key: "delete",
      label: "操作",
      width: "60px",
      render: (v, row) => (
        <button
          onClick={() => {
            const idx = form.order_items.indexOf(row);
            if (idx >= 0) handleRemoveMaterial(idx);
          }}
          className="text-destructive hover:text-destructive/80"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )
    }
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto pb-24">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>产品批发</span>
              <div className="flex items-center gap-3">
                {initialOrder && (
                  <Button size="sm" variant="outline" onClick={() => setShowPrintPreview(true)} className="gap-1.5">
                    <Printer className="h-3.5 w-3.5" /> 打印预览
                  </Button>
                )}
                <span className="text-primary font-bold text-2xl">#{orderNum}</span>
              </div>
            </DialogTitle>
            {initialOrder && (
              <p className="text-xs text-muted-foreground mt-1">
                已付: ${(initialOrder.amount_paid || 0).toFixed(2)} / 合计: ${(initialOrder.total_price || 0).toFixed(2)}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-primary font-semibold">客户名称*</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={clientSearch || form.client_name}
                      onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="搜索或输入客户名"
                    />
                    {showClientDropdown && (clientSearch || form.client_name) && (
                      <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md mt-1 z-10 max-h-48 overflow-y-auto">
                        {filteredClients.length > 0 ? (
                          filteredClients.map(c => (
                            <div
                              key={c.id}
                              onClick={() => handleClientSelect(c)}
                              className="px-3 py-2 cursor-pointer hover:bg-primary/10 text-sm"
                            >
                              {c.name}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">暂无匹配客户</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowClientSelector(true)}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium flex items-center gap-1.5"
                  >
                    <Users className="h-4 w-4" />
                    选择
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>电话(Phone)</Label>
                <Input value={form.phone} onChange={e => f("phone", e.target.value)} />
              </div>
              <div>
                <Label>地址(Address)</Label>
                <Input value={form.address} onChange={e => f("address", e.target.value)} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-sm mb-3">物料明细</h3>
              <Button onClick={() => setShowMaterialSelector(true)} className="gap-2">
                <Plus className="h-4 w-4" /> 选择物料
              </Button>

              <DataTable columns={columns} data={form.order_items} emptyText="暂无物料" />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              {!initialOrder && (
                <div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border">
                    <Checkbox
                      id="is_office"
                      checked={form.is_office}
                      onCheckedChange={val => { f("is_office", val); if (val) f("payment_method", "现金"); }}
                    />
                    <Label htmlFor="is_office" className="font-normal cursor-pointer">定金直接存入办公室(Store in Office)</Label>
                  </div>
                </div>
              )}
              <div className={initialOrder ? "col-span-2" : ""}>
                <Label>定金 ($)</Label>
                <Input type="number" value={form.deposit} onChange={e => f("deposit", Number(e.target.value))} disabled={!!initialOrder} min="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <Label>折扣金额 ($)</Label>
                <Input type="number" value={form.discount} onChange={e => f("discount", Number(e.target.value))} min="0" />
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-xs text-muted-foreground">小计</p>
                <p className="text-lg font-bold">${subtotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 bg-primary/5 rounded">
              <div>
                <p className="text-xs text-muted-foreground">总金额 (折扣后)</p>
                <p className="text-2xl font-bold text-primary">${total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">余款</p>
                <p className="text-2xl font-bold text-destructive">${Math.max(0, balance).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">

            <Button onClick={() => onOpenChange(false)} className="bg-foreground text-background hover:bg-foreground/90">取消</Button>
            <Button onClick={() => handleSave(false)} className="bg-primary text-primary-foreground hover:bg-primary/90">保存</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ClientSelector
        open={showClientSelector}
        onOpenChange={setShowClientSelector}
        onSelect={handleClientSelectorSelect}
      />

      <MaterialSelector
        open={showMaterialSelector}
        onOpenChange={setShowMaterialSelector}
        onSelect={handleAddMaterial}
      />

      {initialOrder && showPrintPreview && (
        <OrderPrintPreview
          open={showPrintPreview}
          onOpenChange={setShowPrintPreview}
          order={initialOrder}
        />
      )}
    </>
  );
}