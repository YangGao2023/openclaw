import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function EmployeeAttendanceEditor({ open, onOpenChange, record, employee, onSave }) {
  const [form, setForm] = useState({
    attendance_date: "",
    leave_hours: 0,
    leave_minutes: 0,
    overtime_hours: 0,
    overtime_minutes: 0,
    meal_subsidy: true
  });

  useEffect(() => {
    if (record) {
      const leaveHours = Math.floor(record.leave_hours || 0);
      const leaveMinutes = Math.round(((record.leave_hours || 0) - leaveHours) * 60);
      const otHours = Math.floor(record.overtime_hours || 0);
      const otMinutes = Math.round(((record.overtime_hours || 0) - otHours) * 60);
      setForm({
        attendance_date: (record.attendance_date || "").split('T')[0],
        leave_hours: leaveHours,
        leave_minutes: leaveMinutes,
        overtime_hours: otHours,
        overtime_minutes: otMinutes,
        meal_subsidy: record.meal_subsidy !== false
      });
    }
  }, [record, open]);

  const handleSave = async () => {
    try {
      const leaveHours = form.leave_hours + form.leave_minutes / 60;
      const otHours = form.overtime_hours + form.overtime_minutes / 60;
      await base44.entities.Attendance.update(record.id, {
        ...form,
        leave_hours: leaveHours,
        overtime_hours: otHours
      });
      toast.success("出勤记录已更新");
      onOpenChange(false);
      onSave();
    } catch (e) {
      toast.error("更新失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑出勤记录</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>日期(Date)</Label>
            <Input type="date" value={form.attendance_date} onChange={(e) => setForm({ ...form, attendance_date: e.target.value })} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
           <div>
             <Label>请假 小时(H)</Label>
             <Input
               type="number"
               min="0"
               value={form.leave_hours}
               onChange={(e) => {
                 const val = parseInt(e.target.value) || 0;
                 setForm({ ...form, leave_hours: val, meal_subsidy: val > 5 ? false : form.meal_subsidy });
               }}
               className="mt-1"
             />
           </div>
           <div>
             <Label>分鐘(min)</Label>
             <Select value={String(form.leave_minutes)} onValueChange={(v) => setForm({ ...form, leave_minutes: parseInt(v) })}>
               <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="0">0</SelectItem>
                 <SelectItem value="15">15</SelectItem>
                 <SelectItem value="30">30</SelectItem>
                 <SelectItem value="45">45</SelectItem>
               </SelectContent>
             </Select>
           </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
           <div>
             <Label>加班 小时(H)</Label>
             <Input
               type="number"
               min="0"
               value={form.overtime_hours}
               onChange={(e) => setForm({ ...form, overtime_hours: parseInt(e.target.value) || 0 })}
               className="mt-1"
             />
           </div>
           <div>
             <Label>分鐘(min)</Label>
             <Select value={String(form.overtime_minutes)} onValueChange={(v) => setForm({ ...form, overtime_minutes: parseInt(v) })}>
               <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="0">0</SelectItem>
                 <SelectItem value="15">15</SelectItem>
                 <SelectItem value="30">30</SelectItem>
                 <SelectItem value="45">45</SelectItem>
               </SelectContent>
             </Select>
           </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="meal" 
              checked={form.leave_hours > 5 ? false : form.meal_subsidy} 
              onChange={(e) => setForm({ ...form, meal_subsidy: e.target.checked })}
              disabled={form.leave_hours > 5}
            />
            <Label htmlFor="meal" className="mb-0 cursor-pointer">{form.leave_hours > 5 ? "(请假>5小时,自动无饭补)" : "有饭补"}</Label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}