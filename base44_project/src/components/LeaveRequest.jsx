import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "./DataTable";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function LeaveRequest() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ 
    employee_id: "", 
    employee_name: "", 
    leave_type: "病假", 
    start_date: "", 
    end_date: "", 
    hours: 0, 
    reason: "", 
    status: "待审批" 
  });

  const loadData = async () => {
    setLoading(true);
    const [reqs, emps] = await Promise.all([
      base44.entities.Attendance.filter({ status: "请假" }, '-created_date', 100),
      base44.entities.Employee.filter({ status: "在职" })
    ]);
    setRequests(reqs);
    setEmployees(emps);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.employee_id || !form.start_date || !form.hours <= 0) {
      toast.error("请填写必要字段");
      return;
    }
    const emp = employees.find(e => e.id === form.employee_id);
    await base44.entities.Attendance.create({
      employee_id: emp.employee_id,
      employee_name: emp.name,
      attendance_date: form.start_date,
      status: "请假",
      leave_hours: form.hours,
      remark: `[${form.leave_type}] ${form.reason}`
    });
    setForm({ employee_id: "", employee_name: "", leave_type: "病假", start_date: "", end_date: "", hours: 0, reason: "", status: "待审批" });
    setShowForm(false);
    toast.success("请假申请已提交");
    loadData();
  };

  const columns = [
    { key: "employee_name", label: "员工", width: "80px" },
    { key: "leave_type", label: "假期类型", width: "70px" },
    { key: "start_date", label: "开始日期", width: "100px", render: (v) => v ? new Date(v).toLocaleDateString("zh-CN") : "-" },
    { key: "hours", label: "时长", width: "60px", render: (v) => `${v}小时` },
    { key: "status", label: "状态", width: "70px", render: (v) => (
      <span className={v === "已批准" ? "text-green-600" : v === "已驳回" ? "text-red-600" : "text-blue-600"}>{v}</span>
    )}
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">请假申请(Leave Requests)</h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> 申请请假
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <DataTable columns={columns} data={requests} />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>申请请假</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>员工</Label>
              <Select value={form.employee_id} onValueChange={(v) => {
                const emp = employees.find(e => e.id === v);
                setForm({ ...form, employee_id: v, employee_name: emp?.name || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="选择员工" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>假期类型</Label>
              <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="病假">病假</SelectItem>
                  <SelectItem value="年假">年假</SelectItem>
                  <SelectItem value="事假">事假</SelectItem>
                  <SelectItem value="婚假">婚假</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>开始日期</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>请假时长(小时)</Label>
                <Input type="number" min="0" value={form.hours} onChange={(e) => setForm({ ...form, hours: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label>原因</Label>
              <Input placeholder="请输入请假原因" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
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