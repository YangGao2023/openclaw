import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function OrderPrintPreview({ open, onOpenChange, order, clients }) {
  const [previewType, setPreviewType] = useState(order?.order_type === "定制单" ? "invoice" : "picking");
  const [settings, setSettings] = useState({
    picking_title: "订单拿货单",
    invoice_title: "发票",
    company_name: "",
    company_name_zh: "",
    company_address: "",
    phones: "",
    email: "",
    website: "",
    zelle: "",
    note: "1. 40% deposit required when you are placing the order.\n2. When the job is complete. The balance must be paid in full.\n3. Extra requirements will charge extra.\n4. 1 year warranty."
  });
  const [materials, setMaterials] = useState([]);

  const loadMaterials = async () => {
    try {
      const data = await base44.entities.Material.list('-created_date', 2000);
      setMaterials(data || []);
    } catch (e) {}
  };

  const loadSettings = async () => {
    try {
      const records = await base44.entities.Settings.filter({ key: "invoice_config" });
      if (records.length > 0) {
        setSettings(JSON.parse(records[0].value));
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadSettings();
    loadMaterials();
    if (order?.order_type === "定制单") {
      setPreviewType("invoice");
    }
  }, [order?.order_type]);

  if (!order) return null;

  const items = order.order_items || [];
  const subtotal = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
  const taxAmt = subtotal * (order.tax_rate || 0) / 100;
  const calcTotal = subtotal - (order.discount || 0) + taxAmt;
  const total = order.total_price || calcTotal;
  const amountPaid = order.amount_paid || 0;
  const balance = Math.max(0, total - amountPaid);

  const handlePrint = () => {
    const html = previewType === "picking" ? buildPickingHTML() : buildInvoiceHTML();
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  const buildPrintBase = (body) => `<!DOCTYPE html><html><head><title></title>
  <style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;margin:0;padding:0}
  html,body{width:100%;font-family:Arial,'Microsoft YaHei',sans-serif;color:#000;background:#fff}
  @page{margin:0;size:A4 portrait}
  @media print{.no-print{display:none!important}}
  .sh{border-top:2px solid #1d4ed8;padding:4px 0 2px 0;font-weight:bold;font-size:11px;color:#1d4ed8;margin-bottom:4px}
  .invoice-wrap{width:90%;margin:0 auto;min-height:297mm;display:flex;flex-direction:column;padding:10mm 0}
  </style></head><body>${body}</body></html>`;

  const getMaterialImage = (code) => {
    const mat = materials.find(m => m.code === code);
    return mat?.image || "";
  };

  const buildPickingHTML = () => {
    const rows = items.map(item => {
      const img = getMaterialImage(item.material_code);
      return `<tr>
        <td style="border:1px solid #ddd;padding:6px">${item.material_code || ""}</td>
        <td style="border:1px solid #ddd;padding:6px">${item.material_name || ""}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${item.quantity}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${img ? `<img src="${img}" style="height:40px;width:40px;object-fit:cover"/>` : ""}</td>
      </tr>`;
    }).join("");

    const body = `
<div style="border-bottom:2px solid #1d4ed8;margin-bottom:12px;padding-bottom:8px;display:flex;justify-content:space-between;align-items:flex-end">
  <div>
    <div style="font-size:20px;font-weight:bold;color:#111">${settings.picking_title || "订单拿货单"}</div>
    ${settings.company_name_zh ? `<div style="font-size:13px;color:#555">${settings.company_name_zh}</div>` : ""}
  </div>
  <div style="text-align:right">
    <div style="font-size:22px;font-weight:bold;color:#1d4ed8">${order.order_number}</div>
    <div style="font-size:11px;color:#777">${order.order_date || ""}</div>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;font-size:11px">
  <div><strong>客户信息</strong><br/>姓名: ${order.client_name}<br/>电话: ${order.phone || ""}<br/>地址: ${order.address || ""}</div>
  <div><strong>订单信息</strong><br/>订单号: ${order.order_number}<br/>日期: ${order.order_date || ""}<br/>总项数: ${items.length}</div>
</div>
<table style="width:100%;border-collapse:collapse;font-size:11px">
  <thead><tr style="border-bottom:2px solid #1d4ed8">
    <th style="padding:6px;text-align:left;color:#1d4ed8">编号 Code</th>
    <th style="padding:6px;text-align:left;color:#1d4ed8">名称 Name</th>
    <th style="padding:6px;text-align:center;color:#1d4ed8">数量 Qty</th>
    <th style="padding:6px;text-align:left;color:#1d4ed8">图片 Image</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>`;
    return buildPrintBase(body);
  };

  const buildInvoiceHTML = () => {
    const isCustom = order.order_type === "定制单";
    const imageUrls = Array.isArray(order.image_urls) ? order.image_urls : (order.image ? [order.image] : []);
    const noteLines = (settings.note || "").split("\n").filter(Boolean).map(l => `<p style="margin:2px 0;font-size:10px">${l}</p>`).join("");

    const rows = items.map(item => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:5px">${item.material_code || ""}</td>
        <td style="padding:5px;text-align:right">$${(item.unit_price||0).toFixed(2)}</td>
        <td style="padding:5px;text-align:center;color:#1d4ed8;font-weight:bold">${item.quantity}</td>
        <td style="padding:5px;text-align:right">$${((item.quantity||0)*(item.unit_price||0)).toFixed(2)}</td>
      </tr>`).join("");

    const productSection = isCustom ? `
      <div style="display:flex;gap:12px;align-items:flex-start">
        ${imageUrls.length > 0 ? `
        <div style="flex:0 0 48%;display:grid;grid-template-columns:${imageUrls.length === 1 ? '1fr' : '1fr 1fr'};gap:6px">
          ${imageUrls.map(url => `<div style="background:#f9f9f9;border:1px solid #e5e7eb;overflow:hidden"><img src="${url}" style="width:100%;height:auto;display:block;object-fit:contain"/></div>`).join('')}
        </div>
        <div style="width:1px;background:#e5e7eb;align-self:stretch;flex-shrink:0"></div>
        ` : ''}
        <div style="flex:1;font-size:12px;line-height:1.8;color:#333;white-space:pre-wrap">${order.description || ""}</div>
      </div>
    ` : `
      <table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed">
      <thead><tr style="border-bottom:2px solid #1d4ed8">
        <th style="padding:5px;text-align:left;width:40%;color:#1d4ed8">编号 Code</th>
        <th style="padding:5px;text-align:right;width:20%;color:#1d4ed8">单价 Price</th>
        <th style="padding:5px;text-align:center;width:15%;color:#1d4ed8">数量 Qty</th>
        <th style="padding:5px;text-align:right;width:25%;color:#1d4ed8">总价 Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      </table>
    `;

    const body = `
    <div class="invoice-wrap">
    <!-- Header -->
    <div style="border-bottom:2px solid #1d4ed8;padding-bottom:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
      <div>
        ${settings.company_name_zh ? `<div style="font-size:22px;font-weight:bold;letter-spacing:2px;color:#111;line-height:1.2">${settings.company_name_zh}</div>` : `<div style="font-size:18px;font-weight:bold;color:#111;line-height:1.2">${settings.invoice_title||"发票"}</div>`}
        ${settings.company_name ? `<div style="font-size:12px;color:#555;margin-top:2px">${settings.company_name}</div>` : ""}
        ${settings.company_address ? `<div style="font-size:11px;color:#777">${settings.company_address}</div>` : ""}
        ${(settings.phones||"").split("\n").filter(Boolean).length > 0 ? `<div style="font-size:13px;font-weight:bold;color:#1d4ed8;margin-top:2px">${(settings.phones||"").split("\n").filter(Boolean).join(" | ")}</div>` : ""}
        ${(settings.email||settings.zelle) ? `<div style="font-size:11px;color:#555">${settings.email ? `Email: ${settings.email}` : ""} ${settings.zelle ? `Zelle: ${settings.zelle}` : ""}</div>` : ""}
      </div>
      <div style="text-align:right;display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:30px;font-weight:bold;color:#1d4ed8;line-height:1">${order.order_number}</div>
        <div style="font-size:11px;color:#777;margin-top:4px">${order.order_date||""}</div>
      </div>
    </div>

    <!-- Contact -->
    <div style="margin-bottom:8px">
      <div style="border-top:2px solid #1d4ed8;padding:3px 0 2px;font-weight:bold;font-size:11px;color:#1d4ed8;margin-bottom:4px">联系信息 Contact</div>
      <div style="border:1px solid #e5e7eb;padding:6px;font-size:11px">
        <span style="margin-right:16px">姓名 Name: ${order.client_name}</span>
        <span style="margin-right:16px">电话 Phone: ${order.phone||""}</span>
        <span>地址 Address: ${order.address||""}</span>
      </div>
    </div>

    <!-- Product (flex-grow to push footer down) -->
    <div style="flex:1;display:flex;flex-direction:column">
      <div style="border-top:2px solid #1d4ed8;padding:3px 0 2px;font-weight:bold;font-size:11px;color:#1d4ed8;margin-bottom:4px">产品信息 Product Information</div>
      <div style="border:1px solid #e5e7eb;padding:10px;flex:1">
        ${productSection}
      </div>
    </div>

    <!-- Note + Totals (pinned to bottom) -->
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px">
    <tr>
     <td style="width:50%;vertical-align:top;padding-right:6px">
       <div style="border-top:2px solid #1d4ed8;padding:3px 0 2px;font-weight:bold;font-size:11px;color:#1d4ed8;margin-bottom:4px">Note</div>
       <div style="border:1px solid #e5e7eb;padding:8px;line-height:1.7">${noteLines}</div>
     </td>
     <td style="width:50%;vertical-align:top;padding-left:6px">
       <div style="border-top:2px solid #1d4ed8;padding:3px 0 2px;font-weight:bold;font-size:11px;color:#1d4ed8;margin-bottom:4px;text-align:right">金额 Amount</div>
       <table style="width:100%;font-size:11px;border:1px solid #e5e7eb">
         <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:4px 8px;color:#555">小计 Subtotal:</td><td style="text-align:right;padding:4px 8px">$${subtotal.toFixed(2)}</td></tr>
         <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:4px 8px;color:#555">税 Tax (${order.tax_rate||0}%):</td><td style="text-align:right;padding:4px 8px">$${taxAmt.toFixed(2)}</td></tr>
         ${(order.discount||0)>0?`<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:4px 8px;color:#555">折扣 Discount:</td><td style="text-align:right;padding:4px 8px">-$${(order.discount||0).toFixed(2)}</td></tr>`:""}
         <tr style="border-bottom:1px solid #e5e7eb;font-weight:bold;font-size:12px"><td style="padding:4px 8px">总计 Total:</td><td style="text-align:right;padding:4px 8px;color:#1d4ed8">$${total.toFixed(2)}</td></tr>
         <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:4px 8px;color:#555">定金 Deposit:</td><td style="text-align:right;padding:4px 8px">$${amountPaid.toFixed(2)}</td></tr>
         <tr style="font-weight:bold;font-size:12px"><td style="padding:4px 8px">余款 Balance:</td><td style="text-align:right;padding:4px 8px;color:#dc2626">$${balance.toFixed(2)}</td></tr>
       </table>
     </td>
    </tr>
    </table>
    </div>`;
    return buildPrintBase(body);
  };

  const imageUrls = Array.isArray(order.image_urls) ? order.image_urls : (order.image ? [order.image] : []);

  return (
    <Dialog open={open && !!order} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex gap-2">
              {order.order_type !== "定制单" && (
                <Button
                  variant={previewType === "picking" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewType("picking")}
                >
                  打印拿货单 (Picking)
                </Button>
              )}
              <Button
                variant={previewType === "invoice" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewType("invoice")}
              >
                打印收据 (Invoice)
              </Button>
            </div>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> 打印
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="border rounded bg-white text-sm overflow-hidden" style={{transformOrigin:'top left'}}>
          <div style={{transform:'scale(0.85)',transformOrigin:'top left',width:'117.65%',marginBottom:'-15%'}}>
          {previewType === "picking" ? (
            <div className="p-6">
              <div className="border-b-2 border-primary pb-3 mb-4 flex justify-between items-end">
                <div>
                  <div className="text-xl font-bold text-gray-900">{settings.picking_title || "订单拿货单"}</div>
                  {settings.company_name_zh && <div className="text-sm text-gray-500">{settings.company_name_zh}</div>}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{order.order_number}</div>
                  <div className="text-xs text-gray-500">{order.order_date}</div>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold mb-1">客户信息</p>
                  <p>姓名: {order.client_name}</p>
                  <p>电话: {order.phone}</p>
                  <p>地址: {order.address}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">订单信息</p>
                  <p>订单号: {order.order_number}</p>
                  <p>日期: {order.order_date}</p>
                  <p>总项数: {items.length}</p>
                </div>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="p-2 text-left text-primary text-xs">编号 Code</th>
                    <th className="p-2 text-left text-primary text-xs">名称 Name</th>
                    <th className="p-2 text-center text-primary text-xs">数量 Qty</th>
                    <th className="p-2 text-left text-primary text-xs">图片 Image</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const matImg = getMaterialImage(item.material_code);
                    return (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-2 text-xs">{item.material_code}</td>
                        <td className="p-2 text-xs">{item.material_name}</td>
                        <td className="p-2 text-center text-xs">{item.quantity}</td>
                        <td className="p-2">
                          {matImg && <img src={matImg} alt="" className="h-10 w-10 object-cover" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-sm">
              {/* Header */}
              <div className="border-b-2 border-primary pb-3 mb-4 flex justify-between items-end">
                <div>
                  {settings.company_name_zh
                    ? <div className="text-2xl font-bold tracking-widest text-gray-900">{settings.company_name_zh}</div>
                    : <h1 className="text-2xl font-bold text-gray-900">{settings.invoice_title || "发票"}</h1>}
                  {settings.company_name && <div className="text-sm text-gray-600">{settings.company_name}</div>}
                  {settings.company_address && <div className="text-xs text-gray-500">{settings.company_address}</div>}
                  {(settings.phones || "").split("\n").filter(Boolean).length > 0 && (
                    <div className="text-sm font-bold text-primary">{(settings.phones || "").split("\n").filter(Boolean).join(" | ")}</div>
                  )}
                  {(settings.email || settings.zelle) && (
                    <div className="text-xs text-gray-500">
                      {settings.email && <span className="mr-3">Email: {settings.email}</span>}
                      {settings.zelle && <span>Zelle: {settings.zelle}</span>}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{order.order_number}</div>
                  <div className="text-xs text-gray-500">{order.order_date}</div>
                </div>
              </div>

              {/* Contact */}
              <div className="mb-4">
                <div className="border-t-2 border-primary pb-1 mb-2 font-semibold text-xs text-primary">联系信息 Contact</div>
                <div className="border border-gray-200 p-3 text-xs space-y-0.5 text-gray-700">
                  <p>姓名 Name: {order.client_name} &nbsp;&nbsp; 电话 Phone: {order.phone} &nbsp;&nbsp; 地址 Address: {order.address}</p>
                </div>
              </div>

              {/* Product section */}
              <div className="border-t-2 border-primary pb-1 mb-2 font-semibold text-xs text-primary">产品信息 Product Information</div>
              <div className="border border-gray-200 p-4 mb-4">
                {order.order_type === "定制单" ? (
                  <div className="flex gap-4 items-start">
                    {imageUrls.length > 0 && (
                      <>
                        <div className={`grid gap-2 flex-shrink-0 w-1/2 ${imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {imageUrls.map((url, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded overflow-hidden">
                              <img src={url} alt={`img-${idx}`} className="w-full h-auto object-contain block" />
                            </div>
                          ))}
                        </div>
                        <div className="w-px bg-gray-200 self-stretch"></div>
                      </>
                    )}
                    {order.description && (
                      <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap flex-1">{order.description}</p>
                    )}
                  </div>
                ) : (
                  <table className="w-full border-collapse text-xs" style={{tableLayout:'fixed'}}>
                    <thead>
                      <tr className="border-b-2 border-primary">
                        <th className="p-2 text-left text-primary w-2/5">编号 Code</th>
                        <th className="p-2 text-right text-primary w-1/5">单价 Price</th>
                        <th className="p-2 text-center text-primary w-1/5">数量 Qty</th>
                        <th className="p-2 text-right text-primary w-1/5">总价 Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className={`border-b border-gray-100 ${idx % 2 !== 0 ? "bg-gray-50" : ""}`}>
                          <td className="p-2">{item.material_code}</td>
                          <td className="p-2 text-right">${(item.unit_price || 0).toFixed(2)}</td>
                          <td className="p-2 text-center font-bold text-primary">{item.quantity}</td>
                          <td className="p-2 text-right">${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Note + Totals */}
              <div className="grid grid-cols-2 gap-3">
                {order.order_type !== "批发单" && (
                  <div>
                    <div className="border-t-2 border-primary pb-1 mb-2 font-semibold text-xs text-primary">Note</div>
                    <div className="border border-gray-200 p-3 text-xs space-y-1 min-h-[100px]">
                      {(settings.note || "").split("\n").filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  </div>
                )}
                <div className={order.order_type === "批发单" ? "col-span-2" : ""}>
                  <div className="border-t-2 border-primary pb-1 mb-2 font-semibold text-xs text-primary text-right">金额 Amount</div>
                  <div className="border border-gray-200 p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">小计 Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">税 Tax ({order.tax_rate || 0}%):</span><span>${taxAmt.toFixed(2)}</span></div>
                    {(order.discount || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">折扣 Discount:</span><span>-${(order.discount || 0).toFixed(2)}</span></div>}
                    <div className="flex justify-between border-t pt-1 font-bold text-base"><span>总计 Total:</span><span className="text-primary">${total.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">定金 Deposit:</span><span>${amountPaid.toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-1 font-bold text-base"><span>余款 Balance:</span><span className="text-destructive">${balance.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}