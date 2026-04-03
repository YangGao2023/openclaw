import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function OrderExport({ orders }) {
  const handleExport = () => {
    const headers = ["订单号", "类型", "客户", "描述", "总金额", "已付", "余款", "税率", "状态", "下单日期", "安装日期", "备注"];
    const rows = orders.map(o => [
      o.order_number, o.order_type, o.client_name, o.description || "",
      (o.total_price||0).toFixed(2), (o.amount_paid||0).toFixed(2), (o.balance||0).toFixed(2),
      `${o.tax_rate||0}%`, o.status, o.order_date || "", o.install_date || "", o.remark || ""
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
      <Download className="h-3.5 w-3.5" /> 导出CSV
    </Button>
  );
}