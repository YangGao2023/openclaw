import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2, Settings } from "lucide-react";
import DataTable from "./DataTable";
import DeleteConfirm from "./DeleteConfirm";
import EmployeeDetail from "./EmployeeDetail";
import EmployeeFormDialog from "./EmployeeFormDialog";
import { toast } from "sonner";

export default function EmployeeList({ employees, loading, onRefresh }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState('employee_id_asc');
  const [mexicoFilter, setMexicoFilter] = useState('all'); // 'all' | 'mexican' | 'nonmexican'
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filtered = employees
    .filter(e => !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.employee_id?.includes(search))
    .filter(e => mexicoFilter === 'all' ? true : mexicoFilter === 'mexican' ? e.is_mexican : !e.is_mexican)
    .slice()
    .sort((a, b) => {
      const [sk, sd] = sortKey.endsWith('_asc') ? [sortKey.replace('_asc',''), 'asc'] : [sortKey.replace('_desc',''), 'desc'];
      let va = sk === 'employee_id' ? (a.employee_id || '') : sk === 'name' ? (a.name || '') : sk === 'daily_rate' ? (a.daily_rate || 0) : '';
      let vb = sk === 'employee_id' ? (b.employee_id || '') : sk === 'name' ? (b.name || '') : sk === 'daily_rate' ? (b.daily_rate || 0) : '';
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sd === 'asc' ? cmp : -cmp;
    });

  const columns = [
    { key: "employee_id", label: "工号", width: "70px" },
    { key: "name", label: "姓名", width: "100px" },
    { key: "contact", label: "联系方式", width: "120px" },
    { key: "daily_rate", label: "日薪", width: "80px", render: (v) => v ? `$${v.toFixed(0)}` : "-" },
    { key: "work_schedule", label: "工作日", width: "80px", render: (v) => v ? `${v.length}天/周` : "-" },
    { key: "meal_allowance", label: "饭补", width: "60px", render: (v) => v ? "✓" : "✗" },
  ];

  const handleDelete = async () => {
    await base44.entities.Employee.delete(deleteId || selectedId);
    toast.success('已删除');
    setDeleteId(null);
    setDeleteOpen(false);
    setSelectedId(null);
    onRefresh();
  };

  const handleEdit = () => {
    const item = employees.find(e => e.id === selectedId);
    if (!item) { toast.error("请先选择一行"); return; }
    setEditItem(item);
    setFormOpen(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索工号/姓名..." className="max-w-xs h-9" />
          <Button size="sm" className="gap-1.5"><Search className="h-3.5 w-3.5" /> 查询</Button>
          <div className="flex gap-1">
            {[['all','全部'],['nonmexican','华人'],['mexican','墨西哥']].map(([v,l]) => (
              <button key={v} onClick={() => setMexicoFilter(v)}
                className={`px-2 py-1 rounded text-xs font-medium border transition ${
                  mexicoFilter === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-100'
                }`}>{l}</button>
            ))}
          </div>
          <Select value={sortKey} onValueChange={setSortKey}>
            <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employee_id_asc">工号 ↑</SelectItem>
              <SelectItem value="employee_id_desc">工号 ↓</SelectItem>
              <SelectItem value="name_asc">姓名 A→Z</SelectItem>
              <SelectItem value="name_desc">姓名 Z→A</SelectItem>
              <SelectItem value="daily_rate_asc">日薪 ↑</SelectItem>
              <SelectItem value="daily_rate_desc">日薪 ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" onClick={() => {
           if (!selectedId) { toast.error("请先选择一行"); return; }
           setDeleteId(selectedId);
           setDeleteOpen(true);
          }} className="gap-1.5">
           <Trash2 className="h-3.5 w-3.5" /> 删除
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1.5">
           <Settings className="h-3.5 w-3.5" /> 配置
          </Button>
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }} className="gap-1.5">
           <Plus className="h-3.5 w-3.5" /> 新增
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} selectedId={selectedId}
          onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)} />
      )}

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editItem} onSave={onRefresh} />
      <EmployeeDetail employee={detailItem} open={showDetail} onClose={() => { setShowDetail(false); onRefresh(); }} />
      <DeleteConfirm open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} title="删除员工" description="确定要删除这个员工吗？" />
      </div>
      );
      }