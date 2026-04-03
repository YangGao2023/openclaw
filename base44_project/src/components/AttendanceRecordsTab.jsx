import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, Edit2, Plus } from "lucide-react";
import DataTable from "./DataTable";
import DeleteConfirm from "./DeleteConfirm";
import EmployeeAttendanceEditor from "./EmployeeAttendanceEditor";

export default function AttendanceRecordsTab() {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [editRecord, setEditRecord] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkValue, setBulkValue] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadRecords();
    }
  }, [selectedEmployee, startDate, endDate]);

  const loadData = async () => {
    const emps = await base44.entities.Employee.filter({ status: "在职" });
    setEmployees(emps);
    setLoading(false);
  };

  const loadRecords = async () => {
    if (!selectedEmployee) return;
    const recs = await base44.entities.Attendance.filter({
      employee_id: selectedEmployee,
      attendance_date: { $gte: startDate, $lte: endDate }
    });
    setRecords(recs);
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Attendance.delete(deleteRecord.id);
      toast.success("记录已删除");
      loadRecords();
      setDeleteOpen(false);
    } catch (e) {
      toast.error("删除失败");
    }
  };

  const handleAddMissingToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    const empsWithAttendance = records.filter(r => r.attendance_date === today).map(r => r.employee_id);
    const missingEmps = employees.filter(e => !empsWithAttendance.includes(e.employee_id));
    
    if (missingEmps.length === 0) {
      toast.info("今天所有员工都已出勤");
      return;
    }

    for (const emp of missingEmps) {
      await base44.entities.Attendance.create({
        employee_id: emp.employee_id,
        employee_name: emp.name,
        attendance_date: today,
        leave_hours: 0,
        overtime_hours: 0,
        meal_subsidy: emp.meal_allowance,
        remark: ""
      });
    }
    toast.success(`已为 ${missingEmps.length} 人添加今天出勤`);
    loadRecords();
  };

  const handleBulkAction = async () => {
    if (!bulkValue) return;
    const val = parseFloat(bulkValue);
    if (isNaN(val)) {
      toast.error("请输入有效数值");
      return;
    }

    for (const rec of records) {
      const update = {};
      if (bulkAction === "leave") update.leave_hours = val;
      else if (bulkAction === "overtime") update.overtime_hours = val;
      else if (bulkAction === "add") {
        update.leave_hours = 0;
        update.overtime_hours = 0;
        update.meal_subsidy = employees.find(e => e.employee_id === rec.employee_id)?.meal_allowance || true;
      }
      if (Object.keys(update).length > 0) {
        await base44.entities.Attendance.update(rec.id, update);
      }
    }
    toast.success("批量操作成功");
    setBulkDialog(false);
    setBulkValue("");
    loadRecords();
  };

  const handleBulkDelete = async () => {
    if (records.length === 0) {
      toast.error("没有记录可删除");
      return;
    }
    for (const rec of records) {
      await base44.entities.Attendance.delete(rec.id);
    }
    toast.success(`已删除 ${records.length} 条记录`);
    loadRecords();
  };

  const columns = [
    { key: "attendance_date", label: "日期(Date)" },
    { key: "employee_name", label: "员工(Employee)" },
    { key: "leave_hours", label: "请假(H)" },
    { 
      key: "worked_hours", 
      label: "工作时长(H)", 
      render: (v, row) => {
        const worked = 10 - (row.leave_hours || 0);
        return worked > 0 ? worked : 0;
      }
    },
    { key: "overtime_hours", label: "加班(H)" }
  ];

  if (loading) return <div>加载中...</div>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleAddMissingToday} variant="outline" className="gap-1">
              <Plus className="w-4 h-4" /> 一键添加今天未出勤
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium">员工(Employee)</label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择员工" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.employee_id}>
                    {emp.name} ({emp.employee_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">开始日期(Start)</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
          </div>

          <div>
            <label className="text-sm font-medium">结束日期(End)</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
          </div>

          <div className="flex items-end">
            <Button onClick={loadRecords} className="w-full">查询</Button>
          </div>
          </div>
          {records.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={() => { setBulkAction("add"); setBulkDialog(true); }} variant="outline" size="sm">批量添加出勤</Button>
              <Button onClick={() => { setBulkAction("leave"); setBulkDialog(true); }} variant="outline" size="sm">批量请假</Button>
              <Button onClick={() => { setBulkAction("overtime"); setBulkDialog(true); }} variant="outline" size="sm">批量加班</Button>
              <Button onClick={handleBulkDelete} variant="destructive" size="sm">批量删除</Button>
            </div>
          )}
          </div>
          </Card>

      {selectedEmployee && (
        <div>
          <DataTable
            columns={columns}
            data={records}
            renderActions={(record) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditRecord(record);
                    setEditOpen(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setDeleteRecord(record);
                    setDeleteOpen(true);
                  }}
                >
                  删除
                </Button>
              </div>
            )}
          />
        </div>
      )}

      <EmployeeAttendanceEditor
        open={editOpen}
        onOpenChange={setEditOpen}
        record={editRecord}
        onSave={loadRecords}
      />

      <DeleteConfirm
        open={deleteOpen}
        onOpenChange={(val) => {
          setDeleteOpen(val);
          if (!val) setDeleteRecord(null);
        }}
        onConfirm={handleDelete}
        title="删除出勤记录"
        description="确定要删除这条出勤记录吗？"
      />

      {bulkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-80">
            <h2 className="font-bold mb-4">
              {bulkAction === "leave" ? "批量请假" : bulkAction === "overtime" ? "批量加班" : "批量添加出勤"}
            </h2>
            {bulkAction !== "add" && (
              <div className="mb-4">
                <label className="text-sm font-medium">小时数</label>
                <Input
                  type="number"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder="输入小时数"
                  className="mt-1"
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setBulkDialog(false); setBulkValue(""); }}>取消</Button>
              <Button onClick={handleBulkAction}>{bulkAction === "add" ? "确认" : "应用"}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}