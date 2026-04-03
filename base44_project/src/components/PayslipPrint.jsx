import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PayslipPrint({ payroll, companyName = "JYC STEEL GROUP INC", weekRange }) {
  const handlePrint = () => {
    const win = window.open("", "_blank", "width=600,height=500");
    win.document.write(`<!DOCTYPE html><html><head><title>工资条</title>
<style>
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:Arial,sans-serif;padding:20px;color:#000;margin:0;font-size:13px}
  @page{margin:10mm;size:A5 landscape}
  .header{background:#1d4ed8;color:white;padding:10px 16px;text-align:center;border-radius:6px;margin-bottom:12px}
  .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee}
  .total{font-size:18px;font-weight:bold;color:#1d4ed8}
</style></head><body>
<div class="header">
  <div style="font-size:16px;font-weight:bold">${companyName}</div>
  <div style="font-size:12px;margin-top:4px">工资条 Payslip — ${weekRange || ""}</div>
</div>
<div class="row"><span>员工姓名 Name:</span><strong>${payroll.employee_name}</strong></div>
<div class="row"><span>员工工号 ID:</span><strong>${payroll.employee_id}</strong></div>
<div class="row"><span>日薪 Daily Rate:</span><strong>$${(payroll.daily_rate||0).toFixed(2)}</strong></div>
<div class="row"><span>工作时数 Work Hours:</span><strong>${(payroll.work_hours||0).toFixed(1)} H</strong></div>
<div class="row"><span>基本薪资 Base Pay:</span><strong>$${(payroll.base_payment||0).toFixed(2)}</strong></div>
<div class="row"><span>饭补天数 Meal Days:</span><strong>${payroll.meal_days || 0} 天</strong></div>
<div class="row"><span>饭补金额 Meal Subsidy:</span><strong>$${(payroll.meal_subsidy_amount||0).toFixed(2)}</strong></div>
<div class="row" style="border-bottom:2px solid #1d4ed8;padding-top:8px;margin-top:4px">
  <span style="font-size:16px;font-weight:bold">实发薪资 Total Pay:</span>
  <strong class="total">$${(payroll.total_payment||0).toFixed(2)}</strong>
</div>
<div style="margin-top:12px;font-size:11px;color:#888">发放日期: ${payroll.pay_date || "未发放"}</div>
</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 300);
  };

  return (
    <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 h-7 text-xs">
      <Printer className="h-3 w-3" /> 打印工资条
    </Button>
  );
}