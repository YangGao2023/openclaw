import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Trash2, GripVertical, FileText } from "lucide-react";
import PayslipPrint from "./PayslipPrint";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import DeleteConfirm from "./DeleteConfirm";
import { toast } from "sonner";

export default function PayrollTab({ employees }) {
  const [payrolls, setPayrolls] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => {
    const todayStr = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
    // ISO day: 1=Mon ... 7=Sun
    const isoDayOfWeek = parseInt(formatInTimeZone(new Date(), 'America/New_York', 'i'));
    const daysToMonday = isoDayOfWeek - 1;
    const d = new Date(todayStr + 'T12:00:00Z');
    d.setDate(d.getDate() - daysToMonday);
    return d.toISOString().split('T')[0];
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [payrollSortKey, setPayrollSortKey] = useState('employee_id_asc');
  const [mexicoFilter, setMexicoFilter] = useState('all'); // 'all'|'mexican'|'nonmexican'
  const [showSummaryMex, setShowSummaryMex] = useState(false);
  const [showSummaryChinese, setShowSummaryChinese] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailPayroll, setDetailPayroll] = useState(null);
  const [rowOrder, setRowOrder] = useState([]);
  const [weekOffset, setWeekOffset] = useState(-1);  // -1 = 上周，0 = 本周

  const loadData = async () => {
    setLoading(true);
    const [atts, payData, settingsData] = await Promise.all([
      base44.entities.Attendance.list('-attendance_date', 1000),
      base44.entities.Payroll.list('-created_date', 500),
      base44.entities.Settings.list()
    ]);
    setAttendances(atts);
    setPayrolls(payData);
    const settingsMap = {};
    settingsData.forEach(s => { settingsMap[s.key] = s.value; });
    setSettings(settingsMap);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const todayStr = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
    // ISO day of week: 1=Mon, 2=Tue, ..., 7=Sun
    const isoDayOfWeek = parseInt(formatInTimeZone(new Date(), 'America/New_York', 'i'));
    const daysToMonday = isoDayOfWeek - 1;
    const d = new Date(todayStr + 'T12:00:00Z');
    d.setDate(d.getDate() - daysToMonday + (weekOffset * 7));
    setWeekStart(d.toISOString().split('T')[0]);
  }, [weekOffset]);

  // 计算薪资
  const calculatePayroll = (emp, startDate, endDate, mealSubsidyPrice) => {
    const timezone = 'America/New_York';

    const empAtts = attendances.filter(a => {
      if (!a.attendance_date || a.employee_id !== emp.employee_id) return false;
      const aDate = a.attendance_date.split('T')[0];
      return aDate >= startDate && aDate <= endDate;
    });

    let totalHours = 0, mealDays = 0;

    empAtts.forEach(a => {
      const actualLeaveHours = a.leave_hours || 0;
      const actualOTHours = a.overtime_hours || 0;
      // 标准工作日10小时，请假扣减，加班补增
      totalHours += Math.max(0, 10 - actualLeaveHours + actualOTHours);
      // 只要meal_subsidy为true就计算饭补
      if (a.meal_subsidy) mealDays++;
    });

    const hourlyRate = (emp.daily_rate || 0) / 10;  // 日薪÷10小时 = 时薪
    const basePayment = totalHours * hourlyRate;
    const mealPayment = mealDays * (mealSubsidyPrice || 0);
    const totalPayment = basePayment + mealPayment;

    return {
      employee_id: emp.employee_id,
      employee_name: emp.name,
      daily_rate: emp.daily_rate || 0,
      work_hours: totalHours,
      meal_days: mealDays,
      meal_subsidy_amount: mealPayment,
      base_payment: basePayment,
      total_payment: totalPayment,
      pay_period_start: startDate,
      pay_period_end: endDate,
      status: "未发放",
      pay_date: ""
    };
  };

  const getWeekRange = (weekStartStr) => {
    const start = weekStartStr;
    const end = new Date(new Date(start).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { start, end };
  };

  const { start, end } = getWeekRange(weekStart);
  const mealSubsidyPrice = parseFloat(settings.meal_subsidy || 8);
  const basePayrolls = employees.map(emp => {
    const empId = emp.employee_id || emp.id;
    const calculated = calculatePayroll({...emp, employee_id: empId}, start, end, mealSubsidyPrice);
    const existing = payrolls.find(p => p.employee_id === empId && p.pay_period_start === start);
    return {
      ...calculated,
      id: existing?.id,
      status: existing?.status || "未发放",
      pay_date: existing?.pay_date || ""
    };
  }).map((p, idx) => ({ ...p, _idx: idx }));

  // Apply drag order
  const currentPayrolls = rowOrder.length === basePayrolls.length
    ? rowOrder.map(idx => basePayrolls[idx]).filter(Boolean)
    : basePayrolls;

  // Reset order when week changes
  useEffect(() => { setRowOrder([]); }, [weekStart]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const order = rowOrder.length === currentPayrolls.length
      ? [...rowOrder]
      : currentPayrolls.map(p => p._idx);
    const [moved] = order.splice(result.source.index, 1);
    order.splice(result.destination.index, 0, moved);
    setRowOrder(order);
  };

  // Filter by mexican
  const filteredPayrolls = mexicoFilter === 'all' ? currentPayrolls
    : currentPayrolls.filter(p => {
        const emp = employees.find(e => e.employee_id === p.employee_id);
        return mexicoFilter === 'mexican' ? emp?.is_mexican : !emp?.is_mexican;
      });

  // Sort payrolls
  const sortedPayrolls = [...filteredPayrolls].sort((a, b) => {
    const [sk, sd] = payrollSortKey.endsWith('_asc') ? [payrollSortKey.replace('_asc',''), 'asc'] : [payrollSortKey.replace('_desc',''), 'desc'];
    let va = sk === 'employee_id' ? (a.employee_id || '') : sk === 'employee_name' ? (a.employee_name || '') : sk === 'total_payment' ? (a.total_payment || 0) : '';
    let vb = sk === 'employee_id' ? (b.employee_id || '') : sk === 'employee_name' ? (b.employee_name || '') : sk === 'total_payment' ? (b.total_payment || 0) : '';
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sd === 'asc' ? cmp : -cmp;
  });

  const totalAmount = sortedPayrolls.reduce((sum, p) => sum + (p.total_payment || 0), 0);
  const totalMeal = sortedPayrolls.reduce((sum, p) => sum + (p.meal_subsidy_amount || 0), 0);

  const handleSavePayroll = async (payroll) => {
    let payrollId = payroll.id;
    if (payroll.id) {
      await base44.entities.Payroll.update(payroll.id, {
        status: payroll.status,
        pay_date: payroll.pay_date,
        total_payment: payroll.total_payment
      });
    } else {
      const created = await base44.entities.Payroll.create({
        employee_id: payroll.employee_id,
        employee_name: payroll.employee_name,
        daily_rate: payroll.daily_rate,
        work_hours: payroll.work_hours,
        meal_days: payroll.meal_days,
        meal_subsidy_amount: payroll.meal_subsidy_amount,
        total_payment: payroll.total_payment,
        base_payment: payroll.base_payment,
        pay_period_start: payroll.pay_period_start,
        pay_period_end: payroll.pay_period_end,
        status: payroll.status,
        pay_date: payroll.pay_date
      });
      payrollId = created.id;
    }
    return payrollId;
  };

  const handlePublish = async (payroll) => {
    // 防止重复发放
    if (payroll.status === "已发放") return;
    const updated = { ...payroll, status: "已发放", pay_date: new Date().toISOString().split('T')[0] };
    const payrollId = await handleSavePayroll(updated);
    
    // 自动生成支出记录
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const expense = await base44.entities.Expense.create({
      target: payroll.employee_name,
      detail: `工资发放 - ${payroll.employee_id}`,
      amount: payroll.total_payment || 0,
      expense_type: "工资",
      payment_method: "现金",
      expense_date: updated.pay_date,
      is_office: true,
      related_order: payrollId,
      remark: `${payroll.employee_name}(${payroll.employee_id}) - 工作${(payroll.work_hours || 0).toFixed(1)}小时 (${timeStr})`
    });
    
    // 保存expense_id到payroll记录
    await base44.entities.Payroll.update(payrollId, { office_cash_id: expense.id });
    
    toast.success(`已发放工资 $${payroll.total_payment?.toFixed(2)}`);
    loadData();
  };

  const handleDelete = async () => {
    if (detailPayroll?.id) {
      await base44.entities.Payroll.delete(detailPayroll.id);
      toast.success("已删除");
      setShowDetail(false);
      loadData();
    } else {
      toast.error("请先选择一条记录");
    }
  };

  const handleCancelPayroll = async (payroll) => {
    if (!payroll.id) { toast.error("无法取消"); return; }
    // 先通过related_order批量删除所有关联支出（确保全部清除）
    const expenses = await base44.entities.Expense.filter({ related_order: payroll.id });
    for (const exp of expenses) {
      await base44.entities.Expense.delete(exp.id);
    }
    // 如果office_cash_id有值但上面没找到，再尝试直接删除
    if (payroll.office_cash_id && !expenses.find(e => e.id === payroll.office_cash_id)) {
      try { await base44.entities.Expense.delete(payroll.office_cash_id); } catch (_) {}
    }
    await base44.entities.Payroll.update(payroll.id, { status: "未发放", pay_date: "", office_cash_id: null });
    toast.success("已取消工资发放，支出已删除");
    setShowDetail(false);
    loadData();
  };

  const columns = [
    { key: "employee_id", label: "工号", width: "60px" },
    { key: "employee_name", label: "姓名", width: "80px" },
    { key: "daily_rate", label: "日薪", width: "70px", render: (v) => `$${(v||0).toFixed(0)}` },
    { key: "work_hours", label: "工作(时)", width: "70px", render: (v) => `${(v || 0).toFixed(1)}` },
    { key: "meal_days", label: "饭补(天)", width: "70px" },
    { key: "total_payment", label: "实发薪资", width: "90px", render: (v) => `$${(v||0).toFixed(2)}` },
    { key: "status", label: "状态", width: "70px", render: (v) => (
      <span className={v === "已发放" ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>{v}</span>
    )},
    { key: "actions", label: "操作", width: "100px", render: (v, row) => (
      row.status === "已发放" ? (
        <Button size="sm" onClick={() => handleCancelPayroll(row)} className="gap-1 bg-red-600 text-white hover:bg-red-700 h-7 text-xs">
          <Trash2 className="w-3 h-3" /> 取消发放
        </Button>
      ) : null
    )},
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
         <div className="flex gap-1">
           <Button 
             variant={weekOffset === -1 ? "default" : "outline"}
             size="sm" 
             onClick={() => setWeekOffset(-1)}
           >上周</Button>
           <Button 
             variant={weekOffset === 0 ? "default" : "outline"}
             size="sm" 
             onClick={() => setWeekOffset(0)}
           >本周</Button>
         </div>
         <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setWeekOffset(weekOffset - 1)}>
           <ChevronLeft className="h-4 w-4" />
         </Button>
         <div className="text-sm"><strong>{weekStart}</strong> 至 <strong>{new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}</strong></div>
         <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setWeekOffset(weekOffset + 1)}>
           <ChevronRight className="h-4 w-4" />
         </Button>
         <div className="ml-auto text-xs text-muted-foreground">
           <span>考勤记录: {attendances.length} | 周期内: {attendances.filter(a => {
             const aDate = formatInTimeZone(new Date(a.attendance_date), 'America/New_York', 'yyyy-MM-dd');
             return aDate >= start && aDate <= end;
           }).length}</span>
         </div>
         <div className="flex gap-1 mx-2">
           {[['all','全部'],['nonmexican','华人'],['mexican','墨西哥']].map(([v,l]) => (
             <button key={v} onClick={() => setMexicoFilter(v)}
               className={`px-2 py-1 rounded text-xs font-medium border transition ${
                 mexicoFilter === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-100'
               }`}>{l}</button>
           ))}
         </div>
         <div className="ml-2 flex gap-2">
         <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowSummaryChinese(true)}>
           <FileText className="h-4 w-4" /> 华人汇总
         </Button>
         <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowSummaryMex(true)}>
           <FileText className="h-4 w-4" /> 墨西哥汇总
         </Button>
           {selectedIds.length > 0 && (
             <Button onClick={async () => {
               for (const idx of selectedIds) {
                 const p = currentPayrolls.find(x => x._idx === idx);
                 if (p && p.status === "未发放") await handlePublish(p);
               }
               setSelectedIds([]);
             }} className="gap-1.5">一键发放工资</Button>
           )}
         </div>
       </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
             <tr className="bg-blue-600 text-white">
               <th className="px-2 py-2 w-6" style={{width: '24px'}}></th>
                {columns.map(col => (
                  <th key={col.key} className="px-2 py-2 text-left" style={{width: col.width}}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="payroll-rows">
                {(provided) => (
                  <tbody ref={provided.innerRef} {...provided.droppableProps}>
                    {sortedPayrolls.map((row, index) => {
                      const isSelected = selectedIds.includes(row._idx);
                      return (
                        <Draggable key={row.employee_id + row.pay_period_start} draggableId={row.employee_id} index={index}>
                          {(drag) => (
                            <tr
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              className={`cursor-pointer transition-colors ${isSelected ? "bg-gray-200" : "bg-white hover:bg-gray-50"}`}
                              onClick={() => setSelectedIds(prev => prev.includes(row._idx) ? prev.filter(i => i !== row._idx) : [...prev, row._idx])}
                            >
                              <td className="px-1 py-1 text-gray-400" {...drag.dragHandleProps} onClick={e => e.stopPropagation()}>
                                <GripVertical className="h-3 w-3" />
                              </td>
                              {columns.map(col => (
                                <td key={col.key} className="px-2 py-1 border-b border-gray-100" style={{width: col.width}}>
                                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                                </td>
                              ))}
                            </tr>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </DragDropContext>
          </table>
        </div>
      )}

      <div className="flex items-center gap-8 mt-4 px-2 text-sm flex-wrap">
        <span>人数: <strong className="text-primary">{currentPayrolls.length}</strong></span>
        <span>工作总时长: <strong>{currentPayrolls.reduce((s, p) => s + (p.work_hours || 0), 0).toFixed(1)}H</strong></span>
        <span>饭补天数: <strong>{currentPayrolls.reduce((s, p) => s + (p.meal_days || 0), 0)}</strong></span>
        <span>饭补: <strong>${totalMeal.toFixed(2)}</strong></span>
        <span>总金额: <strong className="text-destructive text-lg">${totalAmount.toFixed(2)}</strong></span>
      </div>

      {/* Summary Dialogs */}
      {[{open: showSummaryChinese, setOpen: setShowSummaryChinese, title: '华人工资汇总', filter: p => { const emp = employees.find(e => e.employee_id === p.employee_id); return !emp?.is_mexican; }},
        {open: showSummaryMex, setOpen: setShowSummaryMex, title: '墨西哥工资汇总', filter: p => { const emp = employees.find(e => e.employee_id === p.employee_id); return !!emp?.is_mexican; }}]
        .map(({ open, setOpen, title, filter }) => {
          const list = currentPayrolls.filter(filter);
          const listTotal = list.reduce((s,p) => s+(p.total_payment||0), 0);
          return (
            <Dialog key={title} open={open} onOpenChange={setOpen}>
              <DialogContent className="max-w-sm h-[80vh] flex flex-col">
                <DialogHeader><DialogTitle>{title} ({start} 至 {end})</DialogTitle></DialogHeader>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-blue-600 text-white">
                      <th className="px-2 py-1.5 text-left">姓名</th>
                      <th className="px-2 py-1.5 text-right">工时</th>
                      <th className="px-2 py-1.5 text-right">工资</th>
                    </tr></thead>
                    <tbody>
                      {list.map((p, i) => (
                        <tr key={p.employee_id} className={i%2===0?'bg-white':'bg-gray-50'}>
                          <td className="px-2 py-1">{p.employee_name}</td>
                          <td className="px-2 py-1 text-right">{(p.work_hours||0).toFixed(1)}</td>
                          <td className="px-2 py-1 text-right font-medium text-blue-700">${(p.total_payment||0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                      <td className="px-2 py-1">合计</td>
                      <td className="px-2 py-1 text-right">{list.reduce((s,p)=>s+(p.work_hours||0),0).toFixed(1)}</td>
                      <td className="px-2 py-1 text-right text-blue-700">${listTotal.toFixed(2)}</td>
                    </tr></tfoot>
                  </table>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>工资条 - {detailPayroll?.employee_name}</DialogTitle></DialogHeader>
          {detailPayroll && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">工号:</span> <strong>{detailPayroll.employee_id}</strong></div>
                  <div><span className="text-muted-foreground">日薪:</span> <strong>${(detailPayroll.daily_rate || 0).toFixed(2)}</strong></div>
                  <div><span className="text-muted-foreground">工作時数:</span> <strong>{(detailPayroll.work_hours || 0).toFixed(1)}H</strong></div>
                  <div><span className="text-muted-foreground">饭补天数:</span> <strong>{detailPayroll.meal_days}</strong></div>
                </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                <span>基本薪资 ({(detailPayroll.work_hours || 0).toFixed(1)}H × ${((detailPayroll.daily_rate || 0) / 10).toFixed(2)}/H):</span>
                <strong>${((detailPayroll.work_hours || 0) * ((detailPayroll.daily_rate || 0) / 10)).toFixed(2)}</strong>
                </div>
                {detailPayroll.meal_days > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>饭补 ({detailPayroll.meal_days}天):</span>
                    <strong>${(detailPayroll.meal_subsidy_amount || 0).toFixed(2)}</strong>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>实发薪资:</span>
                  <strong className="text-primary">${(detailPayroll.total_payment || 0).toFixed(2)}</strong>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {detailPayroll.status === "已发放" && (
                    <Button onClick={() => handleCancelPayroll(detailPayroll)} className="gap-1.5 bg-red-600 text-white hover:bg-red-700">
                      <Trash2 className="w-4 h-4" /> 取消发放
                    </Button>
                  )}
                {detailPayroll.status === "未发放" && (
                    <Button onClick={() => handlePublish(detailPayroll)}>发放工资</Button>
                  )}
                  <PayslipPrint payroll={detailPayroll} weekRange={`${start} 至 ${end}`} />
                  <Button variant="outline" onClick={() => setShowDetail(false)}>关闭</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirm open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} onConfirm={handleDelete} title="删除工资记录" description="确定要删除这条工资记录吗？" />
    </div>
  );
}