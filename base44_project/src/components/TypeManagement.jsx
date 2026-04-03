import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import DataTable from "./DataTable";

export default function TypeManagement({ type = "income" }) {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "" });
  const [selectedId, setSelectedId] = useState(null);

  const entityName = type === "income" ? "IncomeType" : "ExpenseType";
  const title = type === "income" ? "收入类型(Income Types)" : "支出类型(Expense Types)";

  const loadData = async () => {
    const data = await base44.entities[entityName].list('-sort_order', 200);
    setItems(data);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("类型名必填"); return; }
    if (editItem) {
      await base44.entities[entityName].update(editItem.id, form);
      toast.success("已更新");
    } else {
      await base44.entities[entityName].create(form);
      toast.success("已创建");
    }
    setShowForm(false);
    setEditItem(null);
    setForm({ name: "" });
    loadData();
  };

  const handleDelete = async () => {
    if (!selectedId) { toast.error("请先选择一行"); return; }
    await base44.entities[entityName].delete(selectedId);
    toast.success("已删除");
    setSelectedId(null);
    loadData();
  };

  const handleEdit = () => {
    const item = items.find(i => i.id === selectedId);
    if (!item) { toast.error("请先选择一行"); return; }
    setEditItem(item);
    setForm({ name: item.name });
    setShowForm(true);
  };

  const columns = [
    { key: "name", label: "类型名称(Name)", width: "300px" },
    { key: "sort_order", label: "排序(Sort)", width: "100px" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => { setEditItem(null); setForm({ name: "" }); setShowForm(true); }} className="h-10 gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md rounded-lg font-medium">
          <Plus className="h-4 w-4" /> 新建
        </Button>
        <Button variant="outline" onClick={handleEdit} disabled={!selectedId} className="h-10 gap-2 rounded-lg font-medium hover:bg-blue-50">
          编辑
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={!selectedId} className="h-10 gap-2 bg-red-500 text-white hover:bg-red-600 shadow-md rounded-lg font-medium">
          <Trash2 className="h-4 w-4" /> 删除
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={items}
        selectedId={selectedId}
        onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "编辑" : "新建"}{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>类型名称(Name)*</Label>
              <Input 
                value={form.name} 
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="输入类型名"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}