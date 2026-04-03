import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Calendar, CreditCard, TrendingDown, Printer, Copy, Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function OrderDetail({ open, onOpenChange, order, onUpdated, onPrint }) {
  const [showPayment, setShowPayment] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [refundAmount, setRefundAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("现金");
  const [isOffice, setIsOffice] = useState(false);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [deleteRecordId, setDeleteRecordId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, id: null });
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (open && order?.id) {
      loadPaymentRecords();
    }
  }, [open, order?.id]);

  const loadPaymentRecords = async () => {
    const records = await base44.entities.PaymentRecord.filter({ order_id: order.id }, '-created_date', 100);
    setPaymentRecords(records || []);
  };

  const handleProjectImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingImages(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    const newImages = [...(order.project_images || []), ...urls];
    await base44.entities.Order.update(order.id, { project_images: newImages });
    toast.success(`已上传 ${urls.length} 张完工照`);
    setUploadingImages(false);
    onUpdated();
  };

  const handleDeleteProjectImage = async (idx) => {
    const newImages = (order.project_images || []).filter((_, i) => i !== idx);
    await base44.entities.Order.update(order.id, { project_images: newImages });
    toast.success("已删除");
    onUpdated();
  };

  if (!order) return null;

  const handlePayment = async () => {
    const totalPrice = order.total_after_tax || order.total_price || 0;
    const actualPaid = order.amount_paid || 0;
    const actualBalance = Math.max(0, totalPrice - actualPaid);

    if (actualBalance <= 0) {
      toast.error("订单已结清或已超收，无法继续收款");
      setShowPayment(false);
      return;
    }
    if (payAmount <= 0) { toast.error("金额必须大于0"); return; }
    if (payAmount > actualBalance) { 
      toast.error(`收款金额不能超过余款 $${actualBalance.toFixed(2)}`);
      return;
    }
    
    const newPaid = (order.amount_paid || 0) + payAmount;
    const newBalance = (order.total_after_tax || order.total_price || 0) - newPaid;
    
    // 更新订单
    await base44.entities.Order.update(order.id, {
      amount_paid: newPaid,
      balance: newBalance,
      status: newBalance <= 0 ? "结清" : "未付清"
    });
    
    // 记录收款到PaymentRecord
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const paymentDate = order.order_date || new Date().toISOString().split('T')[0];
    const paymentRecord = await base44.entities.PaymentRecord.create({
      order_id: order.id,
      order_number: order.order_number,
      type: "收款",
      amount: payAmount,
      detail: order.order_type,
      payment_date: paymentDate,
      payment_method: isOffice ? "现金" : paymentMethod,
      description: `${order.client_name} - ${isOffice ? "现金(办公室)" : paymentMethod} (${timeStr})`,
      is_office: isOffice
    });

    // 如果是办公室收款，系统自动添加到现金管理
    if (isOffice) {
      await base44.entities.CashFlow.create({
        flow_type: "转入",
        amount: payAmount,
        flow_date: paymentDate,
        source_type: "订单收入",
        source_id: paymentRecord.id,
        remark: `订单 #${order.order_number} - ${order.client_name}`
      });
    }

    toast.success("收款成功");
    setShowPayment(false);
    setPayAmount(0);
    setPaymentMethod("现金");
    setIsOffice(false);
    await loadPaymentRecords();
    onUpdated();
    };

    const handleRefund = async () => {
    const actualPaid = order.amount_paid || 0;
    if (refundAmount <= 0) { toast.error("金额必须大于0"); return; }
    if (actualPaid <= 0) { toast.error("订单未有收款，无法退款"); return; }
    if (refundAmount > actualPaid) { toast.error(`退款金额不能超过已付金额 $${actualPaid.toFixed(2)}`); return; }

    const newPaid = (order.amount_paid || 0) - refundAmount;
    const newBalance = (order.total_after_tax || order.total_price || 0) - newPaid;

    // 更新订单
    await base44.entities.Order.update(order.id, {
      amount_paid: newPaid,
      balance: newBalance,
      status: newBalance <= 0 ? "结清" : (newPaid > 0 ? "未付清" : "下单")
    });

    // 记录退款
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const paymentDate = order.order_date || new Date().toISOString().split('T')[0];
    const refundRecord = await base44.entities.PaymentRecord.create({
      order_id: order.id,
      order_number: order.order_number,
      type: "退款",
      amount: refundAmount,
      detail: order.order_type,
      payment_date: paymentDate,
      payment_method: isOffice ? "现金" : paymentMethod,
      description: `${order.client_name} - 退款 ${isOffice ? "现金(办公室)" : paymentMethod} (${timeStr})`,
      is_office: isOffice
    });

    // 在支出表中记录退款
    await base44.entities.Expense.create({
      target: order.client_name,
      detail: "订单退款",
      amount: refundAmount,
      expense_type: "退款",
      payment_method: isOffice ? "现金" : paymentMethod,
      expense_date: paymentDate,
      is_office: isOffice,
      related_order: order.order_number,
      remark: `订单 #${order.order_number} 退款 - ${refundRecord.id}`
    });

    // 如果是办公室退款，系统自动从现金管理扣除
    if (isOffice) {
      await base44.entities.CashFlow.create({
        flow_type: "转出",
        amount: refundAmount,
        flow_date: paymentDate,
        source_type: "支出退款",
        source_id: refundRecord.id,
        remark: `订单 #${order.order_number} - ${order.client_name} 退款`
      });
    }

    // 需要检查是否已经有退款记录存在，有的话就不要重複建立
    const existingExpenses = await base44.entities.Expense.filter({ related_order: order.order_number, detail: "订单退款" }, '-created_date', 100);
    const hasExpense = existingExpenses.some(e => Math.abs((e.amount || 0) - refundAmount) < 0.01);
    
    if (!hasExpense) {
      await base44.entities.Expense.create({
        target: order.client_name,
        detail: "订单退款",
        amount: refundAmount,
        expense_type: "退款",
        payment_method: isOffice ? "现金" : paymentMethod,
        expense_date: paymentDate,
        is_office: isOffice,
        related_order: order.order_number,
        remark: `订单 #${order.order_number} 退款 - ${refundRecord.id}`
      });
    }
    
    toast.success("退款成功");
    setShowRefund(false);
    setRefundAmount(0);
    setPaymentMethod("现金");
    setIsOffice(false);
    await loadPaymentRecords();
    onUpdated();
    };

    const handleDeletePayment = async (recordId) => {
    setDeleteConfirm({ open: true, type: 'payment', id: recordId });
    };

    const confirmDelete = async () => {
      if (deleteConfirm.type === 'payment') {
        const recordId = deleteConfirm.id;

    const record = paymentRecords.find(r => r.id === recordId);
    if (!record) return;

    // 计算删除前后的金额差异
    const amount = record.amount || 0;
    const isIncome = record.type === "收款";

    let newPaid = order.amount_paid || 0;
    if (isIncome) {
      newPaid -= amount;
    } else {
      newPaid += amount;
    }
    newPaid = Math.max(0, newPaid);

    const newBalance = (order.total_after_tax || order.total_price || 0) - newPaid;

    // 更新订单
    await base44.entities.Order.update(order.id, {
      amount_paid: newPaid,
      balance: newBalance,
      status: newBalance <= 0 ? "结清" : (newPaid > 0 ? "未付清" : "下单")
    });

    // 删除关联的现金记录
    if (record.is_office && record.office_cash_id) {
      await base44.entities.CashFlow.delete(record.office_cash_id);
    }

    // 如果是删除退款记录，也删除对应的支出记录
    if (record.type === "退款") {
      const expenses = await base44.entities.Expense.filter({ related_order: record.order_number, detail: "订单退款" }, '-created_date', 100);
      for (const e of expenses) {
        if (Math.abs((e.amount || 0) - amount) < 0.01) {
          if (e.is_office && e.office_cash_id) {
            await base44.entities.CashFlow.delete(e.office_cash_id);
          }
          await base44.entities.Expense.delete(e.id);
          break;
        }
      }
    }

    // 删除收付记录
    await base44.entities.PaymentRecord.delete(recordId);
    toast.success("记录已删除");
    await loadPaymentRecords();
    onUpdated();
      } else if (deleteConfirm.type === 'order') {
        // 删除相关的收入记录
        const payments = await base44.entities.PaymentRecord.filter({ order_id: order.id }, '-created_date', 100);
        for (const p of payments) {
          await base44.entities.PaymentRecord.delete(p.id);
        }

        // 删除相关的支出记录
        const expenses = await base44.entities.Expense.filter({ related_order: order.order_number }, '-created_date', 100);
        for (const e of expenses) {
          await base44.entities.Expense.delete(e.id);
        }

        // 删除订单
        await base44.entities.Order.delete(order.id);
        toast.success("订单已删除");
        onUpdated();
        onOpenChange(false);
      }
      setDeleteConfirm({ open: false, type: null, id: null });
    };

  const handleDelete = async () => {
    const totalPrice = order.total_after_tax || order.total_price || 0;
    const isOverpaid = (order.amount_paid || 0) > totalPrice;
    setDeleteConfirm({ 
      open: true, 
      type: 'order',
      message: isOverpaid 
        ? `⚠️ 订单已超收 $${((order.amount_paid || 0) - totalPrice).toFixed(2)}，确认删除该订单及所有相关记录吗？此操作无法撤销。`
        : "确认删除订单及相关记录吗？此操作无法撤销。"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">

        {/* Sticky header with title */}
        <div className="px-6 pt-5 pb-3 border-b flex items-center justify-between flex-shrink-0">
          <span className="text-lg font-semibold">{order.order_type === "定制单" ? "定制单详情" : "批发单详情"}</span>
          <span className="text-primary font-bold text-xl">#{order.order_number}</span>
        </div>

        {/* Sticky financial summary bar */}
        <div className="px-6 py-2 bg-gray-50 border-b flex-shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">总计:</span>
            <span className="font-bold">${((order.total_after_tax || order.total_price) || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">已收:</span>
            <span className="font-bold text-green-600">${(order.amount_paid || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">余款:</span>
            <span className="font-bold text-red-600">${(order.balance || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">状态:</span>
            <span className="font-semibold" style={{
              color: order.status === "结清" ? "#16a34a" : order.status === "未付清" ? "#dc2626" : "#ea580c"
            }}>{order.status}</span>
          </div>
          {(() => {
            const bal = order.balance || 0;
            if (bal <= 0 || order.status === "结清") return null;
            let isOverdue = false;
            if (order.order_type === "定制单") isOverdue = order.installation_status === "已安装";
            else isOverdue = order.shipment_status === "已发货" || order.shipment_status === "已签收";
            if (!isOverdue) return null;
            const refDate = order.order_type === "定制单"
              ? (order.install_date || order.order_date)
              : (order.shipped_date || order.order_date);
            const days = refDate ? Math.floor((new Date() - new Date(refDate)) / 86400000) : 0;
            return days > 0 ? (
              <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">逾期 {days} 天</span>
            ) : null;
          })()}
          {order.remark && (
            <div className="w-full text-xs text-muted-foreground pt-1">
              <span className="font-medium">备注: </span>{order.remark}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-primary font-semibold">客户名称</Label>
                <p className="text-sm mt-1 text-foreground">{order.client_name}</p>
              </div>
              <div>
                <Label>电话</Label>
                <p className="text-sm mt-1 text-foreground">{order.phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> 订单日期</Label>
                <p className="text-sm mt-1 text-foreground">{order.order_date}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">地址</Label>
                <p className="text-sm mt-1 text-foreground">{order.address}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">物流状态</Label>
                {order.order_type === "定制单" ? (
                  <Select
                    value={order.installation_status || "待生产"}
                    onValueChange={async (val) => {
                      await base44.entities.Order.update(order.id, { installation_status: val });
                      onUpdated();
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="待生产">待生产</SelectItem>
                      <SelectItem value="生产中">生产中</SelectItem>
                      <SelectItem value="待安装">待安装</SelectItem>
                      <SelectItem value="已安装">已安装</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={order.shipment_status || "待备货"}
                    onValueChange={async (val) => {
                      const updates = { shipment_status: val };
                      // Auto-stamp shipped_date when first set to 已发货
                      if (val === "已发货" && !order.shipped_date) {
                        updates.shipped_date = new Date().toISOString().split('T')[0];
                      }
                      await base44.entities.Order.update(order.id, updates);
                      onUpdated();
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="待备货">待备货</SelectItem>
                      <SelectItem value="待发货">待发货</SelectItem>
                      <SelectItem value="已发货">已发货</SelectItem>
                      <SelectItem value="已签收">已签收</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  {order.order_type === "定制单" ? "安装日期" : "发货日期"}
                </Label>
                <p className="text-sm mt-1 pt-1">
                  {order.order_type === "定制单" ? (order.install_date || "-") : (order.shipped_date || "-")}
                </p>
              </div>
            </div>

            {paymentRecords.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">收款记录</h3>
                  <div className="flex gap-2">
                    {order.status !== "结清" && (
                      <>
                        <Button size="sm" onClick={() => setShowPayment(true)}>新增收款</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowRefund(true)}>新增退款</Button>
                      </>
                    )}
                    {onPrint && <Button size="sm" variant="outline" onClick={onPrint} className="gap-1"><Printer className="h-3 w-3" /> 打印</Button>}
                    <Button size="sm" variant="destructive" onClick={handleDelete}>删除订单</Button>
                  </div>
                </div>
              </div>
            )}

            {showPayment && order.status !== "结清" && (
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-sm">新增收款</h3>
                <div>
                  <Label>金额</Label>
                  <Input type="number" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} />
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="is_office_payment" checked={isOffice} onCheckedChange={setIsOffice} />
                  <Label htmlFor="is_office_payment" className="font-normal cursor-pointer">办公室</Label>
                </div>
                <div>
                  <Label>支付方式</Label>
                  <Select value={isOffice ? "现金" : paymentMethod} onValueChange={setPaymentMethod} disabled={isOffice}>
                    <SelectTrigger className={isOffice ? "opacity-50" : ""}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="现金">现金</SelectItem>
                      <SelectItem value="支票">支票</SelectItem>
                      <SelectItem value="转账">转账</SelectItem>
                      <SelectItem value="刷卡">刷卡</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handlePayment}>确认收款</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowPayment(false)}>取消</Button>
                </div>
              </div>
            )}

            {showRefund && order.status !== "结清" && (
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-sm">新增退款</h3>
                <div>
                  <Label>退款金额 (已付: ${(order.amount_paid || 0).toFixed(2)})</Label>
                  <Input type="number" value={refundAmount} onChange={e => setRefundAmount(Number(e.target.value))} />
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="is_office_refund" checked={isOffice} onCheckedChange={setIsOffice} />
                  <Label htmlFor="is_office_refund" className="font-normal cursor-pointer">办公室</Label>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleRefund}>确认退款</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowRefund(false)}>取消</Button>
                </div>
              </div>
            )}

            {order.status !== "结清" && !showPayment && !showRefund && (
              <div className="flex gap-2 border-t pt-4">
                <Button onClick={() => setShowPayment(true)}>新增收款</Button>
                <Button variant="outline" onClick={() => setShowRefund(true)}>新增退款</Button>
              </div>
            )}

            {((order.amount_paid || 0) > (order.total_after_tax || order.total_price || 0)) && (
              <div className="border-t pt-4 bg-red-50 border-red-300 p-3 rounded mb-3">
                <p className="text-xs text-red-700 font-semibold">⚠️ 订单已超收：${((order.amount_paid || 0) - (order.total_after_tax || order.total_price || 0)).toFixed(2)}，请删除多余的收款记录。</p>
              </div>
            )}

            {order.order_items && order.order_items.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">订单物料</h3>
                <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
                  {order.order_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start p-2 bg-muted/30 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{item.material_name}</div>
                        <div className="text-muted-foreground text-xs">数量: {item.quantity} × ${(item.unit_price || 0).toFixed(2)}</div>
                      </div>
                      <div className="text-right font-medium">${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">完工照</h3>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleProjectImageUpload} disabled={uploadingImages} />
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent transition-colors ${uploadingImages ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Plus className="h-3 w-3" />{uploadingImages ? '上传中...' : '上传图片'}
                  </span>
                </label>
              </div>
              {order.project_images && order.project_images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {order.project_images.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`完工照${idx + 1}`} className="w-full h-28 object-cover rounded border hover:opacity-80 transition-opacity" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteProjectImage(idx)}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {paymentRecords.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">收款记录</h3>
                <div className="space-y-2 text-sm">
                  {paymentRecords.map((p, idx) => {
                    const isDeposit = idx === 0 && p.type === "收款";
                    const label = p.type === "收款" ? `第${idx + 1}次收款${isDeposit ? "(定金)" : ""}` : "退款";
                    return (
                      <div key={p.id} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{label}</span>
                            <span className={`font-bold ${p.type === "收款" ? "text-green-600" : "text-red-600"}`}>
                              {p.type === "收款" ? "+" : "-"}${(p.amount || 0).toFixed(2)}
                            </span>
                            <span className="text-muted-foreground text-xs">· {p.payment_method}{p.is_office ? ' · 办公室' : ''}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">{p.payment_date}</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDeletePayment(p.id)} className="text-destructive h-6 text-xs">删除</Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {order.order_type === "定制单" && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">安装安排</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const installText = `安装日期：${order.install_date || ""}
          安装人员：${order.install_personnel || ""}
          安装内容：${order.install_remark || ""}
          单号：${order.order_number}
          安装地址：${order.install_address || ""}
          客户：${order.client_name}
          联系方式：${order.phone || ""}
          余款：$${(order.balance || 0).toFixed(2)}.`;
                      navigator.clipboard.writeText(installText);
                      toast.success("已复制到剪贴板");
                    }}
                    className="gap-2"
                  >
                    <Copy className="h-3 w-3" /> 复制
                  </Button>
                </div>
                <div className="space-y-2 text-sm bg-muted/30 p-3 rounded max-h-60 overflow-y-auto">
                  <div><span className="font-medium">安装日期：</span>{order.install_date}</div>
                  <div><span className="font-medium">安装人员：</span>{order.install_personnel}</div>
                  <div><span className="font-medium">安装内容：</span><span className="whitespace-pre-wrap">{order.install_remark}</span></div>
                  <div><span className="font-medium">单号：</span>{order.order_number}</div>
                  <div><span className="font-medium">安装地址：</span>{order.install_address}</div>
                  <div><span className="font-medium">客户：</span>{order.client_name}</div>
                  <div><span className="font-medium">联系方式：</span>{order.phone}</div>
                  <div><span className="font-medium">余款：</span>${(order.balance || 0).toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              {deleteConfirm.message || (deleteConfirm.type === 'payment' ? '确认删除此收付记录？' : '确认删除订单？')}
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}