import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus } from "lucide-react";
import DataTable from "./DataTable";
import { toast } from "sonner";

export default function AppointmentTab({ clients }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("全部");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_name: "", phone: "", address: "", appointment_date: "", description: "" });

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.MeasurementAppointment.list('-created_date', 200);
    setAppointments(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = appointments.filter(a => {
    const matchSearch = !search || a.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchClient = clientFilter === "全部" || a.client_name === clientFilter;
    return matchSearch && matchClient;
  });

  const columns = [
    { key: "client_name", label: "客户名", width: "150px" },
    { key: "phone", label: "电话", width: "130px" },
    { key: "address", label: "测量地址", width: "200px" },
    { key: "appointment_date", label: "预约时间", width: "150px" },
    { key: "description", label: "描述", width: "200px" },
  ];

  const handleSave = async () => {
    if (!form.client_name || !form.appointment_date) { toast.error("客户名和预约时间必填"); return; }
    await base44.entities.MeasurementAppointment.create(form);
    toast.success("预约已创建");
    setShowForm(false);
    setForm({ client_name: "", phone: "", address: "", appointment_date: "", description: "" });
    loadData();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="关键字..." className="max-w-xs h-9" />
          <Button size="sm" className="gap-1.5"><Search className="h-3.5 w-3.5" /> 搜索</Button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="客户" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              {clients.filter(c => c.type !== "供应商").map(c => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> 测量预约
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>新建测量预约</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>客户名*</Label>
              <Select value={form.client_name} onValueChange={v => setForm(p => ({...p, client_name: v}))}>
                <SelectTrigger><SelectValue placeholder="选择客户" /></SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.type !== "供应商").map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>电话</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
            </div>
            <div>
              <Label>测量地址</Label>
              <Input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} />
            </div>
            <div>
              <Label>预约时间*</Label>
              <Input type="datetime-local" value={form.appointment_date} onChange={e => setForm(p => ({...p, appointment_date: e.target.value}))} />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
            <Button onClick={handleSave}>确认</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}