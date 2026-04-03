import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "./DataTable";
import DeleteConfirm from "./DeleteConfirm";
import EmployeeAttendanceEditor from "./EmployeeAttendanceEditor";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function AttendanceTab() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({
    employee_id: "",
    employee_name: "",
    attendance_date: formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd'),
    leave_hours: 0,
    overtime_hours: 0,
    meal_subsidy: true
  });
  const tz = 'America/New_York';
  const todayNY = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');

  const getWeekRange = (offset) => {
    const isoDow = parseInt(formatInTimeZone(new Date(), tz, 'i'));
    const d = new Date(todayNY + 'T12:00:00Z');
    d.setDate(d.getDate() - (isoDow - 1) + offset * 7);
    const start = d.toISOString().split('T')[0];
    const end = new Date(d.getTime() + 6 * 86400000).toISOString().split('T')[0];
    return { start, end };
  };

  const [filterMode, setFilterMode] = useState('thisweek'); // 'single' | 'range' | 'thisweek' | 'lastweek'
  const [singleDate, setSingleDate] = useState(todayNY);
  const [dateRange, setDateRange] = useState(() => getWeekRange(0));
  const [empSearch, setEmpSearch] = useState('');

  useEffect(() => {
    loadData();
    const unsubscribe = base44.entities.Attendance.subscribe(loadData);
    return unsubscribe;
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [atts, emps] = await Promise.all([
      base44.entities.Attendance.list("-attendance_date", 100),
      base44.entities.Employee.list()
    ]);
    setRecords(atts);
    setEmployees(emps);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.attendance_date) { toast.error("请填写员工和日期"); return; }
    const timezone = 'America/New_York';
    const selectedDate = formatInTimeZone(new Date(form.attendance_date), timezone, 'yyyy-MM-dd');
    const emp = employees.find(e => e.id === form.employee_id);
    if (!emp) { toast.error("员工不存在"); return; }
    const hasDuplicate = records.some(r => {
      const rDate = r.attendance_date?.split('T')[0];
      return r.employee_id === emp.employee_id && rDate === selectedDate;
    });
    if (hasDuplicate) {
      toast.error("该员工在此日期已有记录，无需添加");
      return;
    }
    await base44.entities.Attendance.create({
      employee_id: emp.employee_id,
      employee_name: emp.name,
      attendance_date: form.attendance_date,
      leave_hours: form.leave_hours,
      overtime_hours: form.overtime_hours,
      meal_subsidy: form.meal_subsidy
    });
    setForm({
     employee_id: "",
     employee_name: "",
     attendance_date: formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd'),
     leave_hours: 0,
     overtime_hours: 0,
     meal_subsidy: true
    });
    setShowForm(false);
    toast.success("记录已保存");
  };

  const handleDelete = async () => {
    if (!selectedIds.length) { toast.error("请先选择记录"); return; }
    const payrolls = await base44.entities.Payroll.filter({});
    for (const id of selectedIds) {
      const record = records.find(r => r.id === id);
      if (!record) continue;
      const relatedPayroll = payrolls.find(p => p.employee_id === record.employee_id && p.status === "已发放");
      if (relatedPayroll) { toast.error(`${record.employee_name}已发放工资，请先取消发放`); continue; }
      try {
        await base44.entities.Attendance.delete(id);
      } catch (err) {
        continue;
      }
    }
    setSelectedIds([]);
    setShowDeleteConfirm(false);
    await loadData();
    toast.success("已删除");
  };

  const handleEdit = () => {
    if (selectedIds.length !== 1) { toast.error("请选择一条记录编辑"); return; }
    const record = records.find(r => r.id === selectedIds[0]);
    if (!record) { toast.error("记录不存在"); return; }
    setEditingRecord(record);
    setShowEditor(true);
  };

  const handleDateChange = (key, val) => {
    setDateRange({ ...dateRange, [key]: val });
  };

  const setMode = (mode) => {
    setFilterMode(mode);
    if (mode === 'thisweek') setDateRange(getWeekRange(0));
    if (mode === 'lastweek') setDateRange(getWeekRange(-1));
    if (mode === 'single') setDateRange({ start: singleDate, end: singleDate });
  };

  const toggleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  const handleBulkActionSubmit = async () => {
    if (bulkAction === "meal") {
      if (bulkSelectedEmpIds.length === 0) { toast.error("请先选择员工"); return; }
      if (bulkSelectedDates.size === 0) { toast.error("请先选择日期"); return; }
      if (bulkValue === "") { toast.error("请选择饭补状态"); return; }
      const mealValue = bulkValue === "yes";
      for (const empId of bulkSelectedEmpIds) {
        const emp = employees.find(e => e.id === empId);
        if (!emp) continue;
        for (const date of bulkSelectedDates) {
          const rec = records.find(r => r.employee_id === emp.employee_id && r.attendance_date === date);
          if (rec) {
            await base44.entities.Attendance.update(rec.id, { meal_subsidy: mealValue });
          }
        }
      }
      toast.success("饭补已更新");
      setBulkSelectedEmpIds([]);
      setBulkSelectedDates(new Set([new Date().toISOString().split('T')[0]]));
    } else if (bulkAction === "add") {
      if (bulkSelectedEmpIds.length === 0) { toast.error("请先选择员工"); return; }
      if (bulkSelectedDates.size === 0) { toast.error("请先选择日期"); return; }
      for (const empId of bulkSelectedEmpIds) {
        const emp = employees.find(e => e.id === empId);
        if (!emp) continue;
        for (const date of bulkSelectedDates) {
          const hasDuplicate = records.some(r => r.employee_id === emp.employee_id && r.attendance_date === date);
          if (!hasDuplicate) {
            await base44.entities.Attendance.create({
              employee_id: emp.employee_id,
              employee_name: emp.name,
              attendance_date: date,
              leave_hours: 0,
              overtime_hours: 0,
              meal_subsidy: emp.meal_allowance
            });
          }
        }
      }
      toast.success("批量出勤已添加");
      setBulkSelectedEmpIds([]);
      setBulkSelectedDates(new Set([new Date().toISOString().split('T')[0]]));
    } else {
      if (bulkSelectedEmpIds.length === 0) { toast.error("请先选择员工"); return; }
      if (bulkSelectedDates.size === 0) { toast.error("请先选择日期"); return; }
      if (bulkValue === "") { toast.error("请输入有效数值"); return; }
      const val = parseFloat(bulkValue) || 0;
      if (isNaN(val)) { toast.error("请输入有效数值"); return; }

      for (const empId of bulkSelectedEmpIds) {
        for (const date of bulkSelectedDates) {
          let rec = records.find(r => r.employee_id === empId && r.attendance_date === date);
          if (!rec) {
            const emp = employees.find(e => e.id === empId);
            if (!emp) continue;
            rec = await base44.entities.Attendance.create({
              employee_id: emp.employee_id,
              employee_name: emp.name,
              attendance_date: date,
              leave_hours: bulkAction === "leave" ? val : 0,
              overtime_hours: bulkAction === "overtime" ? val : 0,
              meal_subsidy: bulkAction === "leave" && val > 5 ? false : emp.meal_allowance
            });
          } else {
            const update = {};
            if (bulkAction === "leave") {
              update.leave_hours = val;
              update.meal_subsidy = val > 5 ? false : rec.meal_subsidy;
            } else if (bulkAction === "overtime") {
              update.overtime_hours = val;
            }
            if (Object.keys(update).length > 0) {
              await base44.entities.Attendance.update(rec.id, update);
            }
          }
        }
      }
      toast.success("批量操作成功");
      setBulkSelectedEmpIds([]);
      setBulkSelectedDates(new Set([new Date().toISOString().split('T')[0]]));
    }
    setBulkDialog(false);
    setBulkValue("");
    loadData();
  };

  const [filteredRecords, setFilteredRecords] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState(null);
  const [mexicoFilter, setMexicoFilter] = useState('all');
  const [sortKey, setSortKey] = useState('employee_id_asc');
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkSelectedEmpIds, setBulkSelectedEmpIds] = useState([]);
  const [bulkSelectedDates, setBulkSelectedDates] = useState(new Set([new Date().toISOString().split('T')[0]]));
  const [bulkEmpSearch, setBulkEmpSearch] = useState("");

  useEffect(() => {
    let filtered = records.filter(r => {
      if (!r.attendance_date) return false;
      const rDate = r.attendance_date.split('T')[0];
      return rDate >= dateRange.start && rDate <= dateRange.end;
    });
    if (employeeFilter) {
      filtered = filtered.filter(r => r.employee_id === employeeFilter);
    }
    if (mexicoFilter !== 'all') {
      filtered = filtered.filter(r => {
        const emp = employees.find(e => e.employee_id === r.employee_id);
        return mexicoFilter === 'mexican' ? emp?.is_mexican : !emp?.is_mexican;
      });
    }
    if (empSearch.trim()) {
      const q = empSearch.trim().toLowerCase();
      filtered = filtered.filter(r =>
        (r.employee_name || '').toLowerCase().includes(q) ||
        (r.employee_id || '').toLowerCase().includes(q)
      );
    }
    // 排序
    const [sk, sd] = sortKey.split('_asc').length > 1 ? [sortKey.replace('_asc',''), 'asc'] : [sortKey.replace('_desc',''), 'desc'];
    filtered.sort((a, b) => {
      let va, vb;
      if (sk === 'employee_id') { va = a.employee_id || ''; vb = b.employee_id || ''; }
      else if (sk === 'employee_name') { va = a.employee_name || ''; vb = b.employee_name || ''; }
      else if (sk === 'attendance_date') { va = (a.attendance_date || '').split('T')[0]; vb = (b.attendance_date || '').split('T')[0]; }
      else { va = ''; vb = ''; }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sd === 'asc' ? cmp : -cmp;
    });
    setFilteredRecords(filtered);
  }, [records, dateRange, employeeFilter, mexicoFilter, empSearch, sortKey, employees]);

  const columns = [
    { key: "checkbox", label: "", width: "30px", render: (v, row) => (
      <input 
        type="checkbox" 
        checked={selectedIds.includes(row.id)}
        onChange={(e) => {
          e.stopPropagation();
          toggleSelectRow(row.id);
        }}
        className="w-4 h-4 cursor-pointer"
      />
    )},
    { key: "attendance_date", label: "日期", width: "80px", render: (v) => { if (!v) return "-"; const d = v.split('T')[0]; return d.slice(5).replace('-', '/'); } },
    { key: "employee_name", label: "员工", width: "100px" },
    { 
      key: "worked_hours", 
      label: "时长", 
      width: "60px",
      render: (v, row) => {
        const worked = 10 - (row.leave_hours || 0);
        return worked > 0 ? worked : 0;
      }
    },
    { key: "leave_hours", label: "请假", width: "80px", render: (v) => v > 0 ? `${v}H` : "-" },
    { key: "overtime_hours", label: "加班", width: "60px", render: (v) => v > 0 ? `${v}H` : "-" },
    { key: "meal_subsidy", label: "饭补", width: "60px", render: (v) => v ? "✓" : "✗" }
  ];

  return (
    <div className="space-y-3 text-sm">
      {/* 顶部筛选栏 */}
      <div className="bg-gray-50 rounded-lg border p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-600">显示方式:</span>
          {[['thisweek','本周'],['lastweek','上周'],['range','区间'],['single','单日']].map(([m,l]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition border ${
                filterMode === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-100'
              }`}>{l}</button>
          ))}
        </div>

        {filterMode === 'single' && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-600 shrink-0">日期:</Label>
            <Input type="date" value={singleDate} onChange={(e) => { setSingleDate(e.target.value); setDateRange({ start: e.target.value, end: e.target.value }); }} className="h-7 text-xs w-40" />
          </div>
        )}

        {filterMode === 'range' && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-600 shrink-0">区间:</Label>
            <Input type="date" value={dateRange.start} onChange={(e) => handleDateChange('start', e.target.value)} className="h-7 text-xs w-36" />
            <span className="text-gray-400 text-xs">—</span>
            <Input type="date" value={dateRange.end} onChange={(e) => handleDateChange('end', e.target.value)} className="h-7 text-xs w-36" />
          </div>
        )}

        {(filterMode === 'thisweek' || filterMode === 'lastweek') && (
          <div className="text-xs text-gray-500">{dateRange.start} 至 {dateRange.end}</div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {[['all','全部'],['nonmexican','华人'],['mexican','墨西哥']].map(([v,l]) => (
              <button key={v} onClick={() => setMexicoFilter(v)}
                className={`px-2 py-1 rounded text-xs font-medium border transition ${
                  mexicoFilter === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-100'
                }`}>{l}</button>
            ))}
          </div>
          <Label className="text-xs text-gray-600 shrink-0">搜索员工:</Label>
          <Input placeholder="姓名或工号" value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="h-7 text-xs w-36" />
          <Label className="text-xs text-gray-600 shrink-0 ml-2">排序:</Label>
          <Select value={sortKey} onValueChange={setSortKey}>
            <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employee_id_asc" className="text-xs">工号 ↑</SelectItem>
              <SelectItem value="employee_id_desc" className="text-xs">工号 ↓</SelectItem>
              <SelectItem value="employee_name_asc" className="text-xs">姓名 A→Z</SelectItem>
              <SelectItem value="employee_name_desc" className="text-xs">姓名 Z→A</SelectItem>
              <SelectItem value="attendance_date_asc" className="text-xs">日期 早→晚</SelectItem>
              <SelectItem value="attendance_date_desc" className="text-xs">日期 晚→早</SelectItem>
            </SelectContent>
          </Select>
          <Label className="text-xs text-gray-600 shrink-0 ml-2">筛选员工:</Label>
          <Select value={employeeFilter || ''} onValueChange={(v) => setEmployeeFilter(v || null)}>
            <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="全部" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>全部</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.employee_id} className="text-xs">{e.name}({e.employee_id})</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-1 h-7 text-xs">
              <Plus className="w-3 h-3" /> 新增
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setBulkAction("add"); setBulkSelectedEmpIds([]); setBulkSelectedDates(new Set([todayNY])); setBulkEmpSearch(""); setBulkDialog(true); }} className="gap-1 h-7 text-xs">
              <Plus className="w-3 h-3" /> 批量新增
            </Button>
          </div>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-xs">加载中...</div>
        ) : (
          <>
            <DataTable columns={columns} data={filteredRecords} onRowClick={() => {}} selectedId={null} headerColor="bg-blue-600" />
            {filteredRecords.length > 0 && (
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredRecords.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">已选 {selectedIds.length} 项</span>
                </div>
                <div className="flex justify-end gap-2 flex-wrap">
                  {selectedIds.length === 1 && (
                    <Button size="sm" variant="outline" onClick={handleEdit} className="gap-1.5 h-8 text-xs">
                      <Pencil className="w-3 h-3" /> 编辑
                    </Button>
                  )}
                  <Button size="sm" onClick={() => { setBulkAction("add"); setBulkSelectedEmpIds([]); setBulkSelectedDates(new Set([todayNY])); setBulkDialog(true); }} variant="outline" className="h-8 text-xs">+ 批量操作</Button>
                  {selectedIds.length > 0 && (
                    <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="gap-1.5 h-8 text-xs bg-red-600 hover:bg-red-700">
                      <Trash2 className="w-3 h-3" /> 删除 ({selectedIds.length})
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="text-sm">
          <DialogHeader><DialogTitle className="text-base">新增考勤记录</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">员工</Label>
              <Select value={form.employee_id || ''} onValueChange={(v) => {
                const emp = employees.find(e => e.id === v);
                setForm({ ...form, employee_id: v, meal_subsidy: emp ? emp.meal_allowance !== false : true });
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择员工" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}({e.employee_id})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">日期</Label>
              <Input type="date" value={form.attendance_date} onChange={(e) => setForm({ ...form, attendance_date: e.target.value })} className="h-8 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">请假(小时)</Label>
                <Input type="number" min="0" value={form.leave_hours} onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setForm({ ...form, leave_hours: val, meal_subsidy: val > 5 ? false : form.meal_subsidy });
                }} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">加班(小时)</Label>
                <Input type="number" min="0" value={form.overtime_hours} onChange={(e) => setForm({ ...form, overtime_hours: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="meal" 
                checked={form.leave_hours > 5 ? false : form.meal_subsidy} 
                onChange={(e) => setForm({ ...form, meal_subsidy: e.target.checked })}
                disabled={form.leave_hours > 5}
                className="w-4 h-4"
              />
              <Label htmlFor="meal" className="mb-0 cursor-pointer text-xs">{form.leave_hours > 5 ? "(请假>5小时无饭补)" : "有饭补"}</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="h-8 text-xs">取消</Button>
              <Button onClick={handleSave} className="h-8 text-xs">保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirm 
        open={showDeleteConfirm} 
        onConfirm={handleDelete} 
        onCancel={() => setShowDeleteConfirm(false)}
        title="删除记录"
        description="确定要删除选中的记录吗？此操作无法撤销。"
      />

      {bulkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-[90%] max-w-2xl shadow-lg flex flex-col max-h-[90vh] overflow-y-auto text-sm">
            <h2 className="font-bold mb-4 text-sm">批量操作</h2>
            
            {/* 操作类型选择 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border text-xs">
              <Label className="block mb-2 font-semibold text-xs">选择操作</Label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setBulkAction("add"); setBulkSelectedEmpIds([]); setBulkSelectedDates(new Set([new Date().toISOString().split('T')[0]])); setBulkEmpSearch(""); }}
                  className={`px-3 py-1.5 rounded font-medium text-xs transition ${ bulkAction === "add" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}`}
                >
                  + 批量添加出勤
                </button>
                <button
                  onClick={() => { setBulkAction("leave"); setBulkSelectedEmpIds([]); setBulkValue(""); setBulkSelectedDates(new Set([new Date().toISOString().split('T')[0]])); setBulkEmpSearch(""); }}
                  className={`px-3 py-1.5 rounded font-medium text-xs transition ${ bulkAction === "leave" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}`}
                >
                  请假
                </button>
                <button
                  onClick={() => { setBulkAction("overtime"); setBulkSelectedEmpIds([]); setBulkValue(""); setBulkSelectedDates(new Set([new Date().toISOString().split('T')[0]])); setBulkEmpSearch(""); }}
                  className={`px-3 py-1.5 rounded font-medium text-xs transition ${ bulkAction === "overtime" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}`}
                >
                  加班
                </button>
                <button
                  onClick={() => { setBulkAction("meal"); setBulkSelectedEmpIds([]); setBulkValue(""); setBulkSelectedDates(new Set([new Date().toISOString().split('T')[0]])); setBulkEmpSearch(""); }}
                  className={`px-3 py-1.5 rounded font-medium text-xs transition ${ bulkAction === "meal" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}`}
                >
                  饭补
                </button>
              </div>
            </div>

            {/* 日期选择 */}
            {(bulkAction === "add" || bulkAction === "leave" || bulkAction === "overtime" || bulkAction === "meal") && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border text-xs">
                <Label className="mb-2 block font-semibold text-xs">选择日期</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {(() => {
                    const dates = [];
                    const start = new Date('2026-03-23');
                    for (let i = 0; i < 14; i++) {
                      const d = new Date(start);
                      d.setDate(d.getDate() + i);
                      dates.push(d.toISOString().split('T')[0]);
                    }
                    return dates.map(date => {
                      const [year, month, day] = date.split('-');
                      const monthNum = parseInt(month);
                      return (
                        <button
                          key={date}
                          onClick={() => {
                            setBulkSelectedDates(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(date)) newSet.delete(date);
                              else newSet.add(date);
                              return newSet;
                            });
                          }}
                          className={`px-2 py-1 text-xs rounded border font-medium transition ${ bulkSelectedDates.has(date) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                        >
                          {monthNum}/{parseInt(day)}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* 请假/加班时间输入 */}
            {(bulkAction === "leave" || bulkAction === "overtime") && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border text-xs">
                <Label className="mb-2 block font-semibold text-xs">{bulkAction === "leave" ? "请假时长(最大10小时,最小15分钟)" : "加班时长"}</Label>
                <div className="flex gap-3">
                  <div>
                    <Label className="text-xs block mb-1">小时</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={Math.floor(parseFloat(bulkValue) || 0)}
                      onChange={(e) => {
                        const hours = Math.min(10, Math.max(0, Math.floor(parseFloat(e.target.value) || 0)));
                        const mins = Math.floor((parseFloat(bulkValue) % 1) * 60);
                        setBulkValue(hours + mins / 60);
                      }}
                      className="w-16 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs block mb-1">分钟</Label>
                    <Select value={String(Math.floor((parseFloat(bulkValue) % 1) * 60))} onValueChange={(v) => {
                      const hours = Math.floor(parseFloat(bulkValue) || 0);
                      const mins = parseInt(v) || 0;
                      setBulkValue(hours + mins / 60);
                    }}>
                      <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0" className="text-xs">0</SelectItem>
                        <SelectItem value="15" className="text-xs">15</SelectItem>
                        <SelectItem value="30" className="text-xs">30</SelectItem>
                        <SelectItem value="45" className="text-xs">45</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* 员工搜索 */}
            {bulkAction !== "delete" && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border text-xs">
                <Label className="block mb-1.5 font-semibold text-xs">搜索员工</Label>
                <Input
                  type="text"
                  placeholder="输入员工名或工号"
                  value={bulkEmpSearch}
                  onChange={(e) => setBulkEmpSearch(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            )}

            {/* 员工列表 */}
            <div className="mb-3 flex-1 min-h-[150px] max-h-[350px] overflow-y-auto border rounded-lg bg-white text-xs">
              <div className="sticky top-0 z-10 bg-blue-600 text-white">
                <div className="flex items-center p-2 border-b">
                  <input 
                    type="checkbox"
                    className="mr-2 w-3 h-3"
                    checked={bulkSelectedEmpIds.length > 0 && bulkSelectedEmpIds.length === (bulkEmpSearch 
                      ? employees.filter(e => e.name.includes(bulkEmpSearch) || e.employee_id.includes(bulkEmpSearch))
                      : employees
                    ).length}
                    onChange={(e) => {
                      const filtered = bulkEmpSearch 
                        ? employees.filter(e => e.name.includes(bulkEmpSearch) || e.employee_id.includes(bulkEmpSearch))
                        : employees;
                      setBulkSelectedEmpIds(e.target.checked ? filtered.map(e => e.id) : []);
                    }}
                  />
                  <span className="font-semibold text-xs">员工</span>
                </div>
              </div>
              <div className="divide-y">
                {employees
                  .filter(e => !bulkEmpSearch || e.name.includes(bulkEmpSearch) || e.employee_id.includes(bulkEmpSearch))
                  .map((item, idx) => {
                    const isSelected = bulkSelectedEmpIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center p-2 hover:bg-gray-100 cursor-pointer transition ${ isSelected ? "bg-blue-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                        onClick={() => {
                          setBulkSelectedEmpIds(isSelected ? bulkSelectedEmpIds.filter(id => id !== item.id) : [...bulkSelectedEmpIds, item.id]);
                        }}
                      >
                        <input
                          type="checkbox"
                          className="mr-2 w-3 h-3"
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="flex-1 text-xs">{item.name}({item.employee_id})</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setBulkDialog(false); setBulkValue(""); setBulkSelectedEmpIds([]); setBulkEmpSearch(""); }} className="h-7 text-xs">取消</Button>
              <Button 
                onClick={handleBulkActionSubmit} 
                className="h-7 text-xs"
              >
                {bulkAction === "add" ? "批量添加" : bulkAction === "leave" ? "批量请假" : bulkAction === "overtime" ? "批量加班" : bulkAction === "meal" ? "批量更新饭补" : "确认"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <EmployeeAttendanceEditor 
        open={showEditor}
        onOpenChange={setShowEditor}
        record={editingRecord}
        employee={editingRecord ? employees.find(e => e.employee_id === editingRecord.employee_id) : null}
        onSave={() => { loadData(); }}
      />
    </div>
  );
}