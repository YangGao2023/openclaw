import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, X, Users, Eye } from "lucide-react";
import ClientSelector from "./ClientSelector";
import OrderPrintPreview from "./OrderPrintPreview";

export default function OrderForm({ open, onOpenChange, orderType, clients, onSaved, initialOrder }) {
  const [form, setForm] = useState({
    client_name: "", phone: "", address: "", description: "",
    total_price: 0, deposit: 0, payment_method: "现金",
    is_office: false, tax_rate: 0, install_personnel: "",
    install_date: "", install_address: "", install_remark: "",
    image_urls: [], order_date: new Date().toISOString().split("T")[0]
  });
  const [orderNum, setOrderNum] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [printSettings, setPrintSettings] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState(["现金", "支票", "转账", "刷卡"]);

  useEffect(() => {
    if (open) {
      if (initialOrder) {
        setOrderNum(initialOrder.order_number);
        setForm({
          client_name: initialOrder.client_name || "",
          phone: initialOrder.phone || "",
          address: initialOrder.address || "",
          description: initialOrder.description || "",
          total_price: initialOrder.total_price || 0,
          deposit: initialOrder.amount_paid || 0,
          payment_method: initialOrder.payment_method || "现金",
          is_office: initialOrder.is_office || false,
          tax_rate: initialOrder.tax_rate || 0,
          install_personnel: initialOrder.install_personnel || "",
          install_date: initialOrder.install_date || "",
          install_address: initialOrder.install_address || "",
          install_remark: initialOrder.install_remark || "",
          image_urls: Array.isArray(initialOrder.image_urls) ? initialOrder.image_urls : (initialOrder.image ? [initialOrder.image] : []),
          order_date: initialOrder.order_date || new Date().toISOString().split("T")[0]
        });
      } else {
        generateOrderNumber();
        setForm({
          client_name: "", phone: "", address: "", description: "",
          total_price: 0, deposit: 0, payment_method: "现金",
          is_office: false, tax_rate: 0, install_personnel: "",
          install_date: "", install_address: "", install_remark: "",
          image_urls: [], order_date: new Date().toISOString().split("T")[0]
        });
      }
    }
  }, [open, initialOrder]);

  const handlePrintPreview = async () => {
    let s = printSettings;
    if (!s) {
      try {
        const records = await base44.entities.Settings.filter({ key: "invoice_config" });
        s = records.length > 0 ? JSON.parse(records[0].value) : {};
        setPrintSettings(s);
      } catch (e) { s = {}; }
    }
    const totalAfterTaxVal = form.total_price * (1 + (form.tax_rate || 0) / 100);
    const balanceVal = Math.max(0, totalAfterTaxVal - (initialOrder?.amount_paid || 0));
    const imageUrls = Array.isArray(form.image_urls) ? form.image_urls : (form.image ? [form.image] : []);
    const noteLines = (s.note || "").split("\n").filter(Boolean).map(l => `<p style="margin:2px 0;font-size:10px">${l}</p>`).join("");
    const isCustom = orderType === "定制单";
    const productSection = isCustom ? `
      <div style="display:flex;gap:12px;align-items:flex-start">
        ${imageUrls.length > 0 ? `<div style="flex:0 0 48%;display:grid;grid-template-columns:${imageUrls.length === 1 ? '1fr' : '1fr 1fr'};gap:6px">${imageUrls.map(url => `<div style="background:#f9f9f9;border:1px solid #e5e7eb"><img src="${url}" style="width:100%;height:auto;display:block;object-fit:contain"/></div>`).join('')}</div><div style="width:1px;background:#e5e7eb;align-self:stretch;flex-shrink:0"></div>` : ''}
        <div style="flex:1;font-size:12px;line-height:1.8;color:#333;white-space:pre-wrap">${form.description || ""}</div>
      </div>` : `<p style="color:#999;font-size:12px">批发单 - 请在订单详情页查看明细</p>`;
    const html = `<!DOCTYPE html><html><head><title>Invoice</title>
    <style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    html,body{font-family:Arial,'Microsoft YaHei',sans-serif;color:#000;background:#fff}
    @page{margin:0;size:A4 portrait}
    .wrap{width:90%;margin:0 auto;min-height:297mm;display:flex;flex-direction:column;padding:10mm 0}
    </style></head><body><div class="wrap">
    <div style="border-bottom:2px solid #1d4ed8;padding-bottom:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
      <div>
        ${s.company_name_zh ? `<div style="font-size:22px;font-weight:bold;color:#111">${s.company_name_zh}</div>` : `<div style="font-size:18px;font-weight:bold;color:#111">${s.invoice_title || "发票"}</div>`}
        ${s.company_name ? `<div style="font-size:12px;color:#555">${s.company_name}</div>` : ""}
        ${s.company_address ? `<div style="font-size:11px;color:#777">${s.company_address}</div>` : ""}
        ${(s.phones || "").split("\n").filter(Boolean).length > 0 ? `<div style="font-size:13px;font-weight:bold;color:#1d4ed8">${(s.phones || "").split("\n").filter(Boolean).join(" | ")}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:30px;font-weight:bold;color:#1d4ed8">${orderNum || initialOrder?.order_number || ""}</div>
        <div style="font-size:11px;color:#777">${form.order_date || ""}</div>
      </div>
    </div>
    <div style="margin-bottom:8px">
      <div style="border-top:2px solid #1d4ed8;padding:3px 0 2px;font-weight:bold;font-size:11px;color:#1d4ed8;margin-bottom:4px">联系信息 Contact</div>
      <div style="border:1px solid #e5e7eb;padding:6px;font-size:11px">
        <span style="margin-right:16px">姓名 Name: ${form.client_name}</span>
        <span style="margin-right:16px">电话 Phone: ${form.phone || ""}</span>
        <span>地址 Address: ${form.address || ""}</span>
      </div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column">
      <div style="border-top:2px solid #1d4ed8;padding:3px 0 2px;font-weight:bold;font-size:11px;color:#1d4ed8;margin-bottom:4px">产品信息 Product Information</div>
      <div style="border:1px solid #e5e7eb;padding:10px;flex:1">${productSection}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px"><tr>
      <td style="width:50%;vertical-align:top;padding-right:6px">
        <div style="border-top:2px solid #1d4ed8;padding:3px 0 2px;font-weight:bold;font-size:11px;color:#1d4ed8;margin-bottom:4px">Note</div>
        <div style="border:1px solid #e5e7eb;padding:8px;line-height:1.7">${noteLines}</div>
      </td>
      <td style="width:50%;vertical-align:top;padding-left:6px">
        <div style="border-top:2px solid #1d4ed8;padding:3px 0 2px;font-weight:bold;font-size:11px;color:#1d4ed8;margin-bottom:4px;text-align:right">金额 Amount</div>
        <table style="width:100%;font-size:11px;border:1px solid #e5e7eb">
          <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:4px 8px;color:#555">总价 Total:</td><td style="text-align:right;padding:4px 8px;font-weight:bold;color:#1d4ed8">$${form.total_price.toFixed(2)}</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:4px 8px;color:#555">税 Tax (${form.tax_rate || 0}%):</td><td style="text-align:right;padding:4px 8px">$${(totalAfterTaxVal - form.total_price).toFixed(2)}</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb;font-weight:bold"><td style="padding:4px 8px">税后总计:</td><td style="text-align:right;padding:4px 8px;color:#1d4ed8">$${totalAfterTaxVal.toFixed(2)}</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:4px 8px;color:#555">已付 Paid:</td><td style="text-align:right;padding:4px 8px">$${(initialOrder?.amount_paid || 0).toFixed(2)}</td></tr>
          <tr style="font-weight:bold"><td style="padding:4px 8px">余款 Balance:</td><td style="text-align:right;padding:4px 8px;color:#dc2626">$${balanceVal.toFixed(2)}</td></tr>
        </table>
      </td>
    </tr></table>
    </div></body></html>`;
    const win = window.open("", "_blank", "width=900,height=700");
    const printBtn = `<div class="no-print" style="position:fixed;top:16px;right:16px;z-index:9999">
      <button onclick="window.print()" style="background:#1d4ed8;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:14px;cursor:pointer;font-family:Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.2)">🖨️ 打印 Print</button>
    </div>`;
    const fullHtml = html.replace('<body>', '<body>' + printBtn);
    win.document.write(fullHtml);
    win.document.close();
  };

  const generateOrderNumber = async () => {
    try {
      const res = await base44.functions.invoke('generateOrderNumber', {});
      setOrderNum(res.data.order_number);
    } catch (err) {
      console.error('Failed to generate order number:', err);
    }
  };

  const totalAfterTax = form.total_price * (1 + (form.tax_rate || 0) / 100);
  const balance = totalAfterTax - form.deposit;

  const handleClientSelect = (client) => {
    setForm(p => ({
      ...p, client_name: client.name,
      phone: client.contact || "", address: client.address || ""
    }));
    setClientSearch("");
    setShowClientDropdown(false);
  };

  const filteredClients = (clients || []).filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

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

  const handleSave = async (createNew = false) => {
     if (!form.client_name) { toast.error("客户名必填"); return; }
     if (form.total_price <= 0) { toast.error("总价必填"); return; }
     const client = clients.find(c => c.name === form.client_name);

     if (initialOrder) {
       // 编辑模式 - 禁止修改已付的定金
       const oldPaid = initialOrder.amount_paid || 0;
       const newPaid = oldPaid; // 保持原来的已付金额
       
       await base44.entities.Order.update(initialOrder.id, {
         ...form,
         image_urls: form.image_urls,
         order_type: orderType,
         total_after_tax: totalAfterTax,
         balance: balance,
         amount_paid: newPaid,
         status: newPaid >= totalAfterTax ? "结清" : (newPaid > 0 ? "未付清" : "下单")
       });
       
       // 如果新增了定金，则记录新收款
       if (newPaid > oldPaid && (newPaid - oldPaid) > 0) {
         const now = new Date();
         const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
         await base44.entities.PaymentRecord.create({
           order_id: initialOrder.id,
           order_number: initialOrder.order_number,
           type: "收款",
           amount: newPaid - oldPaid,
           detail: initialOrder.order_type,
           payment_date: form.order_date,
           payment_method: form.is_office ? "现金" : form.payment_method,
           description: `${form.client_name} - 追加定金 (${timeStr})`,
           is_office: form.is_office
         });
       }
       
       toast.success("订单已更新");
       onSaved();
       return;
     }

     const createdOrder = await base44.entities.Order.create({
       ...form,
       image_urls: form.image_urls,
       client_id: client?.id || "",
       order_number: orderNum,
       order_type: orderType,
       total_after_tax: totalAfterTax,
       balance: balance,
       amount_paid: form.deposit,
       status: form.deposit >= totalAfterTax ? "结清" : "下单"
     });
    
    // 记录收入到PaymentRecord（定金部分）
    if (form.deposit > 0) {
      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      const paymentRecord = await base44.entities.PaymentRecord.create({
        order_id: createdOrder.id,
        order_number: orderNum,
        type: "收款",
        amount: form.deposit,
        detail: form.order_type,
        payment_date: form.order_date,
        payment_method: form.is_office ? "现金" : form.payment_method,
        description: `${form.client_name} - ${form.is_office ? "现金(办公室)" : form.payment_method} (${timeStr})`,
        is_office: form.is_office
      });

      // 如果是办公室收入，则添加到现金管理
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
    if (createNew) {
      generateOrderNumber();
      setForm(p => ({
        ...p, client_name: "", phone: "", address: "", description: "",
        total_price: 0, deposit: 0, payment_method: "现金", image_urls: [],
        install_personnel: "", install_date: "", install_address: "", install_remark: "", tax_rate: 0
      }));
    } else {
      onSaved();
    }
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    f("image_urls", [...form.image_urls, ...urls]);
    toast.success(`已上传${urls.length}张图片`);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto pb-24">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{orderType === "定制单" ? "产品定制" : "产品批发"}</span>
            <span className="text-primary font-bold text-2xl">#{orderNum}</span>
          </DialogTitle>
          {initialOrder && (
           <p className="text-xs text-muted-foreground mt-1">
             已付: ${(initialOrder.amount_paid || 0).toFixed(2)} / 合计: ${(initialOrder.total_after_tax || 0).toFixed(2)}
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
              <Label>支付方式(Payment)</Label>
              <Select value={form.is_office ? "现金" : form.payment_method} onValueChange={v => f("payment_method", v)} disabled={form.is_office}>
                <SelectTrigger className={form.is_office ? "opacity-50" : ""}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="现金">现金</SelectItem>
                  <SelectItem value="转账">转账</SelectItem>
                  <SelectItem value="支票">支票</SelectItem>
                  <SelectItem value="刷卡">刷卡</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-3">定金管理(Deposit)</h3>
            {!initialOrder && (
              <div className="flex items-center gap-3 mb-4">
                <Checkbox
                  id="is_office"
                  checked={form.is_office}
                  onCheckedChange={val => { f("is_office", val); if (val) f("payment_method", "现金"); }}
                />
                <Label htmlFor="is_office" className="font-normal cursor-pointer">定金直接存入办公室(Store in Office)</Label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>地址(Address)</Label>
              <Input value={form.address} onChange={e => f("address", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>描述(Description)</Label>
            <Textarea value={form.description} onChange={e => f("description", e.target.value)} rows={3} />
          </div>

          <div>
            <Label>图片(Image)</Label>
            <div className="flex gap-2 items-end">
              <Input type="file" accept="image/*" multiple onChange={handleImageUpload} className="text-xs" />
            </div>
            {form.image_urls.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {form.image_urls.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt={`img-${idx}`} className="h-32 w-full object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => f("image_urls", form.image_urls.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-destructive/90"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>总价(Total Price)</Label>
              <Input type="number" value={form.total_price} onChange={e => f("total_price", Number(e.target.value))} />
            </div>
            <div>
              <Label>定金(Deposit)</Label>
              <Input type="number" value={form.deposit} onChange={e => f("deposit", Number(e.target.value))} disabled={!!initialOrder} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>税(Tax) %</Label>
              <Input type="number" value={form.tax_rate} onChange={e => f("tax_rate", Number(e.target.value))} />
            </div>
            <div className="col-span-2 flex items-end">
              <p className="text-sm text-muted-foreground">
                税后总金额: <strong className="text-foreground">${totalAfterTax.toFixed(2)}</strong>
              </p>
            </div>
          </div>

          {orderType === "定制单" && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-sm mb-3">安装安排(Installation)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>安装日期(Date)</Label>
                  <Input type="date" value={form.install_date} onChange={e => f("install_date", e.target.value)} />
                </div>
                <div>
                  <Label>安装人员(Personnel)</Label>
                  <Input value={form.install_personnel} onChange={e => f("install_personnel", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>安装地址(Address)</Label>
                  <Input value={form.install_address} onChange={e => f("install_address", e.target.value)} placeholder="或从地址复制" />
                </div>
              </div>
              <div className="mt-4">
                <Label>安装内容(Remark)</Label>
                <Textarea value={form.install_remark} onChange={e => f("install_remark", e.target.value)} rows={3} placeholder="详细描述安装内容" />
              </div>
            </div>
          )}

          </div>

        <div className="flex justify-end gap-2 mt-4">
           <Button onClick={handlePrintPreview} variant="outline" className="gap-2"><Eye className="h-4 w-4" />打印预览</Button>
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

        </>
        );
}