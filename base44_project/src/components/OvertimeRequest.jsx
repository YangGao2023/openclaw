import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataTable from "./DataTable";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function OvertimeRequest() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ 
    employee_id: "", 
    employee_name: "", 
    date: "", 
    hours: 0, 
    reason: "",
    status: "待审批"
  });

  const loadData = async () => {
    setLoading(true);
    const [atts, emps] = await Promise.all([
      base44.entities.Attendance.filter({ overtime_hours: { $gt: 0 } }, '-created_date', 100),
      base44.entities.Employee.filter({ status: "在职" })
    ]);
    setRequests(atts);
    setEmployees(emps);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.employee_id || !form.date || form.hours <= 0) {
      toast.error("请填写必要字段");
      return;
    }
    const emp = employees.find(e => e.id === form.employee_id);
    await base44.entities.Attendance.create({
      employee_id: emp.employee_id,
      employee_name: emp.name,
      attendance_date: form.date,
      status: "出勤",
      overtime_hours: form.hours,
      remark: `加班申请: ${form.reason}`
    });
    setForm({ employee_id: "", employee_name: "", date: "", hours: 0, reason: "", status: "待审批" });
    setShowForm(false);
    toast.success("加班申请已提交");
    loadData();
  };

  const columns = [
    { key: "employee_name", label: "员工", width: "80px" },
    { key: "attendance_date", label: "日期", width: "100px", render: (v) => v ? new Date(v).toLocaleDateString("zh-CN") : "-" },
    { key: "overtime_hours", label: "加班时长", width: "80px", render: (v) => `${v}小时` },
    { key: "remark", label: "备注", width: "120px", render: (v) => v ? v.slice(0, 20) : "-" }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">加班申请(Overtime Requests)</h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> 申请加班
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <DataTable columns={columns} data={requests} />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>申请加班</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>员工</Label>
              <select 
                value={form.employee_id} 
                onChange={(e) => {
                  const emp = employees.find(x => x.id === e.target.value);
                  setForm({ ...form, employee_id: e.target.value, employee_name: emp?.name || "" });
                }}
                className="w-full h-9 px-3 border rounded-md"
              >
                <option value="">选择员工</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <Label>加班日期</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>加班时长(小时)</Label>
              <Input type="number" min="0" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>原因</Label>
              <Input placeholder="请输入加班原因" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
              <Button onClick={handleSave}>提交申请</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}