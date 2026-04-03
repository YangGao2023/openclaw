import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const WEEKDAYS = [
  { value: 1, label: "一(Mon)" },
  { value: 2, label: "二(Tue)" },
  { value: 3, label: "三(Wed)" },
  { value: 4, label: "四(Thu)" },
  { value: 5, label: "五(Fri)" },
  { value: 6, label: "六(Sat)" },
  { value: 0, label: "日(Sun)" }
];

export default function EmployeeDetail({ employee, open, onClose }) {
  const [form, setForm] = useState(employee || {});

  const handleToggleDay = (day) => {
    const schedule = form.work_schedule || [];
    if (schedule.includes(day)) {
      setForm({ ...form, work_schedule: schedule.filter(d => d !== day) });
    } else {
      setForm({ ...form, work_schedule: [...schedule, day].sort() });
    }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("请输入员工名字"); return; }
    await base44.entities.Employee.update(form.id, {
      daily_rate: form.daily_rate,
      work_schedule: form.work_schedule,
      meal_allowance: form.meal_allowance,
      remark: form.remark
    });
    toast.success("员工信息已更新");
    onClose();
  };

  if (!open || !employee) return null;

  const schedule = form.work_schedule || [];
  const workDayCount = schedule.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>员工详情 - {form.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">工号</Label>
            <p className="font-mono">{form.employee_id}</p>
          </div>

          <div>
            <Label>日薪(Daily Rate) CNY</Label>
            <Input type="number" min="0" step="0.01" value={form.daily_rate || 0} onChange={(e) => setForm({ ...form, daily_rate: parseFloat(e.target.value) || 0 })} />
          </div>

          <div>
            <Label className="mb-2 block">工作日程(Work Schedule) - {workDayCount}天/周</Label>
            <div className="grid grid-cols-4 gap-2">
              {WEEKDAYS.map(day => (
                <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={schedule.includes(day.value)} onCheckedChange={() => handleToggleDay(day.value)} />
                  <span className="text-xs">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={form.meal_allowance !== false} onCheckedChange={(v) => setForm({ ...form, meal_allowance: v })} />
            <Label className="font-normal cursor-pointer">享受饭补(Meal Allowance)</Label>
          </div>

          <div>
            <Label>备注(Remark)</Label>
            <Input value={form.remark || ""} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}