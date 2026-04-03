import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, Trash2, Pencil } from "lucide-react";
import DataTable from "./DataTable";
import DateRangeSelector from "./DateRangeSelector";
import { toast } from "sonner";
import DeleteConfirm from "./DeleteConfirm";

const emptyForm = {
  target: "", detail: "", amount: 0, expense_type: "其他",
  payment_method: "现金", expense_date: new Date().toISOString().split("T")[0],
  is_office: false, remark: ""
};

export default function ExpenseTab() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [methods, setMethods] = useState(["现金", "支票", "转账", "刷卡"]);
  const [selectedIds, setSelectedIds] = useState([]);
  const selectedId = selectedIds[0] || null;
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCannotDeleteAlert, setShowCannotDeleteAlert] = useState(false);
  const [dateRange, setDateRange] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Expense.list('-created_date', 500);
    setExpenses(data);
    setLoading(false);
    await syncRefundsToExpenses();
  };

  const loadExpenseTypes = async () => {
    const types = await base44.entities.ExpenseType.list('sort_order', 200);
    setExpenseTypes(types);
  };

  const syncRefundsToExpenses = async () => {
    try {
      const refunds = await base44.entities.PaymentRecord.filter({ type: "退款" }, '-created_date', 500);
      const currentExpenses = await base44.entities.Expense.list('-created_date', 500);
      
      for (const refund of refunds) {
        const hasExpense = currentExpenses.some(e => 
          e.related_order === refund.order_number && 
          e.detail === "订单退款" && 
          Math.abs((e.amount || 0) - refund.amount) < 0.01
        );
        
        if (!hasExpense && refund.order_number) {
          const newExpense = await base44.entities.Expense.create({
            target: refund.order_number,
            detail: "订单退款",
            amount: refund.amount,
            expense_type: "退款",
            payment_method: refund.payment_method || "现金",
            expense_date: refund.payment_date || new Date().toISOString().split("T")[0],
            is_office: refund.is_office || false,
            related_order: refund.order_number,
            remark: `退款记录ID: ${refund.id}`
          });
          currentExpenses.push(newExpense);
          setExpenses(prev => [newExpense, ...prev]);
        }
      }
    } catch (err) {
      console.error("同步退款失败:", err);
    }
  };

  useEffect(() => { 
    loadData();
    loadExpenseTypes();
    const unsubscribe = base44.entities.Expense.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        loadData();
      }
    });
    return unsubscribe;
  }, []);

  const filtered = expenses.filter(e => {
    const ms = !search || e.target?.toLowerCase().includes(search.toLowerCase()) || e.detail?.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === "全部" || e.expense_type === typeFilter;
    const mm = methods.includes(e.payment_method);
    let md = true;
    if (dateRange) {
      const expDate = e.expense_date;
      md = expDate >= dateRange.startDate && expDate <= dateRange.endDate;
    }
    return ms && mt && mm && md;
  });

  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const columns = [
    { key: "target", label: "对象", width: "120px" },
    { key: "detail", label: "明细", width: "150px" },
    { key: "amount", label: "金额", width: "100px", render: (v) => <span className="font-medium text-red-600">${(v || 0).toFixed(2)}</span> },
    { key: "expense_type", label: "类型", width: "80px" },
    { key: "payment_method", label: "形式", width: "80px", render: (v) => {
      if (v === "现金") return <span className="text-green-600 font-medium">现金</span>;
      if (v === "支票") return <span className="text-amber-600 font-medium">支票</span>;
      return v;
    }},
    { key: "expense_date", label: "日期", width: "100px", render: (v) => <span className="text-orange-600 font-medium">{v}</span> },
    { key: "remark", label: "备注", width: "120px" },
  ];

  const handleSave = async () => {
    if (!form.amount) { toast.error("金额必填"); return; }
    if (!form.expense_type) { toast.error("类型必填"); return; }
    
    let finalData = { ...form };
    if (finalData.is_office) finalData.payment_method = "现金";
    finalData.related_order = finalData.related_order || "";
    
    if (editItem) {
      // 编辑时，如果之前是办公室支出，要删除对应的转出记录
      if (editItem.is_office && editItem.office_cash_id) {
        await base44.entities.CashFlow.delete(editItem.office_cash_id);
      }
      finalData = { ...finalData, office_cash_id: null };
      
      // 如果现在勾选了办公室，创建新的转出记录
      if (form.is_office) {
        const cash = await base44.entities.CashFlow.create({
          flow_type: "转出",
          amount: form.amount,
          flow_date: form.expense_date,
          source_type: "支出",
          source_id: editItem.id,
          remark: `${form.target || form.detail}`
        });
        finalData.office_cash_id = cash.id;
      }
      
      await base44.entities.Expense.update(editItem.id, finalData);
      toast.success("已更新");
    } else {
      const created = await base44.entities.Expense.create(finalData);
      
      // 如果勾选了办公室，则添加到现金管理
      if (form.is_office) {
        const cash = await base44.entities.CashFlow.create({
          flow_type: "转出",
          amount: form.amount,
          flow_date: form.expense_date,
          source_type: "支出",
          source_id: created.id,
          remark: `${form.target || form.detail}`
        });
        await base44.entities.Expense.update(created.id, { office_cash_id: cash.id });
      }
      toast.success("已创建");
    }
    
    setShowForm(false);
    setEditItem(null);
    setForm(emptyForm);
    loadData();
  };

  const handleEdit = () => {
    const item = expenses.find(e => e.id === selectedId);
    if (!item) { toast.error("请先选择一行"); return; }
    setEditItem(item);
    setForm({
      target: item.target || "", detail: item.detail || "", amount: item.amount || 0,
      expense_type: item.expense_type || "其他", payment_method: item.payment_method || "现金",
      expense_date: item.expense_date || "", is_office: item.is_office || false, remark: item.remark || ""
    });
    setShowForm(true);
  };

  const handleClickDelete = () => {
    if (!selectedIds.length) { toast.error("请先选择一行"); return; }
    const hasSalary = selectedIds.some(id => expenses.find(e => e.id === id)?.detail?.includes("工资发放"));
    if (hasSalary) { setShowCannotDeleteAlert(true); return; }
    const hasOrderExpense = selectedIds.some(id => {
      const item = expenses.find(e => e.id === id);
      return item?.related_order && item.related_order.trim() !== "";
    });
    if (hasOrderExpense) { setShowCannotDeleteAlert(true); return; }
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    for (const id of selectedIds) {
      const item = expenses.find(e => e.id === id);
      if (item?.is_office && item.office_cash_id) await base44.entities.CashFlow.delete(item.office_cash_id);
      await base44.entities.Expense.delete(id);
    }
    toast.success(`已删除 ${selectedIds.length} 条`);
    setSelectedIds([]);
    setShowDeleteConfirm(false);
    loadData();
  };

  const toggleMethod = (m) => {
    setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm shadow-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 搜索对象/明细..." className="pl-8 h-10 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent font-medium" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">类型:</span>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[{ id: "all", name: "全部" }, ...expenseTypes].map(t => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">支付方式:</span>
              {["现金", "支票", "转账", "刷卡"].map(m => (
                <div key={m} className="flex items-center gap-1.5">
                  <Checkbox 
                    id={`expense-${m}`}
                    checked={methods.includes(m)}
                    onCheckedChange={() => toggleMethod(m)}
                  />
                  <Label htmlFor={`expense-${m}`} className="text-sm cursor-pointer">{m}</Label>
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
          <DataTable columns={columns} data={filtered} selectedIds={selectedIds}
            onRowClick={(row) => setSelectedIds(prev => prev.includes(row.id) ? prev.filter(i => i !== row.id) : [...prev, row.id])} headerColor="bg-red-600" />
          <div className="flex items-center justify-between mt-4">
            <span className="text-lg">
              <span className="text-primary font-semibold">总计: </span>
              <strong className="text-red-600 text-xl">${total.toFixed(2)}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => { setEditItem(null); setForm(emptyForm); setShowForm(true); }} className="gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md rounded-lg font-medium">
                <Plus className="h-4 w-4" /> 新增
              </Button>
              <Button variant="outline" size="sm" onClick={handleEdit} disabled={selectedIds.length !== 1} className="h-9 gap-2 rounded-lg font-medium hover:bg-blue-50">
                <Pencil className="h-4 w-4" /> 编辑
              </Button>
              <Button size="sm" onClick={handleClickDelete} disabled={!selectedIds.length} className="h-9 gap-2 bg-red-500 text-white hover:bg-red-600 shadow-md rounded-lg font-medium">
                <Trash2 className="h-4 w-4" /> 删除 ({selectedIds.length})
              </Button>

            </div>
          </div>
        </>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "编辑支出" : "新增支出"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>对象</Label><Input value={form.target} onChange={e => f("target", e.target.value)} /></div>
            <div><Label>明细</Label><Input value={form.detail} onChange={e => f("detail", e.target.value)} /></div>
            <div><Label>金额*</Label><Input type="number" value={form.amount} onChange={e => f("amount", Number(e.target.value))} /></div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>类型</Label>
                  <Select value={form.expense_type} onValueChange={v => f("expense_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {expenseTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>支付方式</Label>
                  <Select value={form.is_office ? "现金" : form.payment_method} onValueChange={v => f("payment_method", v)} disabled={form.is_office}>
                    <SelectTrigger className={form.is_office ? "opacity-50" : ""}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["现金", "支票", "转账", "刷卡"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>日期</Label><Input type="date" value={form.expense_date} onChange={e => f("expense_date", e.target.value)} /></div>
              <div className="flex items-center gap-2">
                <Checkbox id="is-office" checked={form.is_office} onCheckedChange={v => { f("is_office", v); if (v) f("payment_method", "现金"); }} />
                <Label htmlFor="is-office" className="text-sm cursor-pointer">办公室</Label>
              </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
      />

      <AlertDialog open={showCannotDeleteAlert} onOpenChange={setShowCannotDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>不能删除</AlertDialogTitle>
            <AlertDialogDescription>订单相关的支出和工资发放记录不能在此删除。订单支出请在订单详情中处理，工资支出请在工资发放tab中取消发放。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction>了解</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      );
      }