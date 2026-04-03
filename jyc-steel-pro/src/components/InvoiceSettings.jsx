import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const defaultSettings = {
  picking_title: "订单拿货单",
  invoice_title: "发票",
  company_name: "",
  company_name_zh: "",
  company_address: "",
  phones: "",
  email: "",
  website: "",
  zelle: "",
  note: "1. 40% deposit required when you are placing the order.\n2. When the job is complete. The balance must be paid in full.\n3. Extra requirements will charge extra.\n4. 1 year warranty."
};

export default function InvoiceSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const records = await base44.entities.Settings.filter({ key: "invoice_config" });
      if (records.length > 0) {
        setSettings({ ...defaultSettings, ...JSON.parse(records[0].value) });
        setRecordId(records[0].id);
      }
    } catch (e) {}
    setLoading(false);
  };

  const handleSave = async () => {
    const value = JSON.stringify(settings);
    if (recordId) {
      await base44.entities.Settings.update(recordId, { key: "invoice_config", value });
    } else {
      const r = await base44.entities.Settings.create({ key: "invoice_config", value });
      setRecordId(r.id);
    }
    toast.success("设置已保存 Settings saved");
  };

  const f = (key, val) => setSettings(p => ({ ...p, [key]: val }));

  if (loading) return <div className="py-8 text-center text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <Label>拿货单标题 Picking Title</Label>
            <Input value={settings.picking_title} onChange={e => f("picking_title", e.target.value)} placeholder="订单拿货单" className="rounded-lg border border-gray-300" />
          </div>
          <div>
            <Label>公司中文名称 Company Name (Chinese)</Label>
            <Input value={settings.company_name_zh} onChange={e => f("company_name_zh", e.target.value)} placeholder="正豪鐵艺集团" className="rounded-lg border border-gray-300" />
          </div>
          <div>
            <Label>公司英文名称 Company Name (English)</Label>
            <Input value={settings.company_name} onChange={e => f("company_name", e.target.value)} placeholder="JYC STEEL GROUP INC" className="rounded-lg border border-gray-300" />
          </div>
          <div>
            <Label>邮箱 Email</Label>
            <Input value={settings.email} onChange={e => f("email", e.target.value)} placeholder="email@example.com" className="rounded-lg border border-gray-300" />
          </div>
          <div>
            <Label>网页 Website</Label>
            <Input value={settings.website} onChange={e => f("website", e.target.value)} placeholder="www.example.com" className="rounded-lg border border-gray-300" />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div>
            <Label>公司地址 Company Address</Label>
            <Input value={settings.company_address} onChange={e => f("company_address", e.target.value)} placeholder="公司地址" className="rounded-lg border border-gray-300" />
          </div>
          <div>
            <Label>电话(多行) Phone Numbers (one per line)</Label>
            <Textarea
              value={settings.phones}
              onChange={e => f("phones", e.target.value)}
              placeholder={"电话1\n电话2"}
              rows={3}
              className="rounded-lg border border-gray-300"
            />
          </div>
          <div>
            <Label>Zelle 转账号码 Zelle ID</Label>
            <Input value={settings.zelle} onChange={e => f("zelle", e.target.value)} placeholder="Zelle 电话或邮箱" className="rounded-lg border border-gray-300" />
          </div>
        </div>
      </div>

      <div>
        <Label>Note 备注内容 (Note Content on Invoice)</Label>
        <Textarea
          value={settings.note}
          onChange={e => f("note", e.target.value)}
          placeholder="备注内容..."
          rows={5}
          className="rounded-lg border border-gray-300"
        />
      </div>

      <Button onClick={handleSave} className="h-10 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md rounded-lg font-medium">保存设置 Save</Button>
    </div>
  );
}