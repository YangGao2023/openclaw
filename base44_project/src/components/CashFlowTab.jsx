import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataTable from "./DataTable";
import DeleteConfirm from "./DeleteConfirm";
import DateRangeSelector from "./DateRangeSelector";
import { toast } from "sonner";

export default function CashFlowTab() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const selectedId = selectedIds[0] || null;
  const [transferType, setTransferType] = useState("转出");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState({ amount: 0, flow_date: new Date().toISOString().split("T")[0], remark: "" });
  const [dateRange, setDateRange] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.CashFlow.list('-created_date', 500);
    setFlows(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = base44.entities.CashFlow.subscribe(() => loadData());
    return unsubscribe;
  }, []);

  const filtered = flows.filter(f => {
    if (!dateRange) return true;
    return f.flow_date >= dateRange.startDate && f.flow_date <= dateRange.endDate;
  });

  const totalInflow = filtered.filter(f => f.flow_type === "转入").reduce((s, f) => s + (f.amount || 0), 0);
  const totalOutflow = filtered.filter(f => f.flow_type === "转出").reduce((s, f) => s + (f.amount || 0), 0);
  const totalCash = totalInflow - totalOutflow;

  const columns = [
    { key: "flow_type", label: "类型", width: "80px", render: (v) => <span className={v === "转入" ? "text-green-600" : "text-destructive"}>{v}</span> },
    { key: "flow_date", label: "日期", width: "100px" },
    { key: "amount", label: "金额", width: "100px", render: (v) => `$${(v || 0).toFixed(2)}` },
    { key: "source_type", label: "来源", width: "100px" },
    { key: "remark", label: "明细(Detail)", width: "180px" },
  ];

  const handleSave = async () => {
    if (form.amount <= 0) { toast.error("金额必须大于0"); return; }
    await base44.entities.CashFlow.create({
      flow_type: transferType,
      amount: form.amount,
      flow_date: form.flow_date,
      source_type: transferType === "转出" ? "手动转出" : "手动转入",
      remark: form.remark
    });
    toast.success("记录已创建");
    setShowForm(false);
    setTransferType("转出");
    setForm({ amount: 0, flow_date: new Date().toISOString().split("T")[0], remark: "" });
    loadData();
  };

  const handleDeleteClick = () => {
    if (!selectedIds.length) { toast.error("请先选择记录"); return; }
    const nonManual = selectedIds.find(id => { const item = flows.find(f => f.id === id); return item && !item.source_type?.includes("手动"); });
    if (nonManual) { const item = flows.find(f => f.id === nonManual); toast.error(`有记录来自 ${item.source_type}，不能删除`); return; }
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    for (const id of selectedIds) await base44.entities.CashFlow.delete(id);
    toast.success(`已删除 ${selectedIds.length} 条`);
    setSelectedIds([]);
    setShowDeleteConfirm(false);
    loadData();
  };

  return (
    <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
      <div className="grid grid-cols-3 gap-4 mb-6">
       <div className="bg-card border rounded-lg p-4">
         <p className="text-sm text-muted-foreground">转入</p>
         <p className="text-2xl font-bold text-green-600">${totalInflow.toFixed(2)}</p>
       </div>
       <div className="bg-card border rounded-lg p-4">
         <p className="text-sm text-muted-foreground">转出</p>
         <p className="text-2xl font-bold text-destructive">${totalOutflow.toFixed(2)}</p>
       </div>
       <div className="bg-card border rounded-lg p-4">
         <p className="text-sm text-muted-foreground">现金总额</p>
         <p className="text-2xl font-bold text-primary">${totalCash.toFixed(2)}</p>
       </div>
      </div>

      <DateRangeSelector onDateChange={setDateRange} />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={filtered}
          selectedIds={selectedIds}
          onRowClick={(row) => setSelectedIds(prev => prev.includes(row.id) ? prev.filter(i => i !== row.id) : [...prev, row.id])}
          headerColor="bg-green-600"
        />
      )}

      <div className="flex justify-between items-center mt-4">
        <Button size="sm" variant="destructive" onClick={handleDeleteClick} disabled={!selectedId} className="gap-1.5">
          删除
        </Button>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setTransferType("转出"); setShowForm(true); }} className="gap-1.5">
            转出现金
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { setTransferType("转入"); setShowForm(true); }} className="gap-1.5">
            转入现金
          </Button>
        </div>
      </div>

       <Dialog open={showForm} onOpenChange={setShowForm}>
         <DialogContent className="max-w-sm">
           <DialogHeader><DialogTitle>{transferType === "转出" ? "转出现金" : "转入现金"}</DialogTitle></DialogHeader>
           <div className="space-y-3">
             <div><Label>事项</Label><Input placeholder="输入事项描述" value={form.remark} onChange={e => setForm(p => ({...p, remark: e.target.value}))} /></div>
             <div><Label>金额*</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: Number(e.target.value)}))} /></div>
             <div><Label>日期</Label><Input type="date" value={form.flow_date} onChange={e => setForm(p => ({...p, flow_date: e.target.value}))} /></div>
           </div>
           <div className="flex justify-end gap-2 mt-4">
             <Button variant="outline" onClick={() => { setShowForm(false); setTransferType("转出"); }}>取消</Button>
             <Button onClick={handleSave}>确认</Button>
           </div>
         </DialogContent>
       </Dialog>

       <DeleteConfirm
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={handleDelete}
        />
       </div>
       );
       }