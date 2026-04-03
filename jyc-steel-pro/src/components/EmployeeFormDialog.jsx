import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const WEEKDAYS = [
  { label: "周一", value: 1 },
  { label: "周二", value: 2 },
  { label: "周三", value: 3 },
  { label: "周四", value: 4 },
  { label: "周五", value: 5 },
  { label: "周六", value: 6 },
  { label: "周日", value: 0 }
];

export default function EmployeeFormDialog({ open, onOpenChange, employee, onSave }) {
  const [form, setForm] = useState({
    employee_id: "",
    name: "",
    contact: "",
    daily_rate: 0,
    meal_allowance: true,
    is_mexican: false,
    work_schedule: [],
    status: "在职"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm(employee);
    } else {
      generateEmployeeId();
    }
  }, [employee, open]);

  const generateEmployeeId = async () => {
    try {
      const res = await base44.functions.invoke("generateEmployeeId", {});
      setForm(prev => ({ ...prev, employee_id: res.data.employee_id }));
    } catch (e) {
      toast.error("生成工号失败");
    }
  };

  const toggleWorkDay = (day) => {
    setForm(prev => ({
      ...prev,
      work_schedule: prev.work_schedule.includes(day)
        ? prev.work_schedule.filter(d => d !== day)
        : [...prev.work_schedule, day]
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.daily_rate) {
      toast.error("请填写必要信息");
      return;
    }

    setLoading(true);
    try {
      if (employee) {
        await base44.entities.Employee.update(employee.id, form);
      } else {
        await base44.entities.Employee.create(form);
      }
      toast.success(employee ? "员工已更新" : "员工已创建");
      onSave();
      onOpenChange(false);
    } catch (e) {
      toast.error("保存失败");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee ? "编辑员工" : "新增员工"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>工号(ID)</Label>
              <Input value={form.employee_id} disabled className="mt-1" />
            </div>
            <div>
              <Label>姓名(Name)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>联系方式(Contact)</Label>
              <Input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>日薪 $ (Daily Rate)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.daily_rate}
                onChange={(e) => setForm({ ...form, daily_rate: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 border rounded p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.meal_allowance}
                onCheckedChange={(checked) => setForm({ ...form, meal_allowance: checked })}
              />
              <Label>享受饭补(Meal Allowance)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.is_mexican === true}
                onCheckedChange={(checked) => setForm({ ...form, is_mexican: checked })}
              />
              <Label>墨西哥员工(Mexican)</Label>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">工作日程(Work Schedule)</Label>
            <div className="grid grid-cols-4 gap-2">
              {WEEKDAYS.map(day => (
                <div key={day.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={form.work_schedule.includes(day.value)}
                    onCheckedChange={() => toggleWorkDay(day.value)}
                  />
                  <Label>{day.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={handleSave} disabled={loading}>保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}