import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function HRSettings() {
  const [settings, setSettings] = useState({
    meal_subsidy: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settingsData = await base44.entities.Settings.list();
    const settingsMap = {};
    settingsData.forEach(s => {
      if (s.key.startsWith('hr_')) {
        settingsMap[s.key.replace('hr_', '')] = s.value;
      }
    });
    if (Object.keys(settingsMap).length > 0) {
      setSettings(prev => ({ ...prev, ...settingsMap }));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const existing = await base44.entities.Settings.filter({ key: 'hr_meal_subsidy' });
      if (existing.length > 0) {
        await base44.entities.Settings.update(existing[0].id, { value: String(settings.meal_subsidy) });
      } else {
        await base44.entities.Settings.create({ key: 'hr_meal_subsidy', value: String(settings.meal_subsidy) });
      }
      toast.success("设置已保存");
    } catch (e) {
      toast.error("保存失败");
    }
  };

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">人力资源设置(HR Settings)</h3>
      </div>

      <div className="space-y-4 border rounded-lg p-4">
        <div>
          <Label>饭补标准(¥/天)</Label>
          <Input 
            type="number" 
            step="0.01" 
            min="0"
            value={settings.meal_subsidy} 
            onChange={(e) => setSettings({ ...settings, meal_subsidy: parseFloat(e.target.value) || 0 })}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">每位享受饭补的员工每个工作日的饭补金额</p>
        </div>
      </div>

      <Button onClick={handleSave}>保存设置</Button>
    </div>
  );
}