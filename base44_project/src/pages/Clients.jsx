import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import DataTable from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import ClientForm from "../components/ClientForm";
import ClientOrdersPanel from "../components/ClientOrdersPanel";
import ClientFinanceCard from "../components/ClientFinanceCard";
import { toast } from "sonner";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Client.list('-created_date', 200);
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = clients.filter(c => 
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact?.includes(search)
  );

  const columns = [
    { key: "name", label: "名称", width: "150px" },
    { key: "type", label: "类别", width: "100px" },
    { key: "contact", label: "联系方式", width: "130px" },
    { key: "email", label: "邮箱", width: "150px" },
    { key: "address", label: "地址", width: "200px" },
    { key: "balance", label: "账户余额", width: "100px", render: (val) => {
      const v = val || 0;
      return <span className={v < 0 ? "text-destructive font-medium" : "text-success font-medium"}>${v.toFixed(2)}</span>;
    }},
    { key: "remark", label: "备注", width: "150px" },
  ];

  const handleDelete = async () => {
    if (!selectedId) { toast.error("请先选择一行"); return; }
    await base44.entities.Client.delete(selectedId);
    toast.success("已删除");
    setSelectedId(null);
    loadData();
  };

  const handleEdit = () => {
    const item = clients.find(c => c.id === selectedId);
    if (!item) { toast.error("请先选择一行"); return; }
    setEditItem(item);
    setShowForm(true);
  };

  const handleDeleteWithConfirm = async () => {
    if (!selectedId) { toast.error("请先选择一行"); return; }
    if (!window.confirm("确认删除此客户吗？")) return;
    await base44.entities.Client.delete(selectedId);
    toast.success("已删除");
    setSelectedId(null);
    loadData();
  };

  return (
    <div>
      <PageHeader title="客户/供应商管理" subtitle="Client & Supplier Management" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md shadow-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 搜索名称/联系方式..." className="pl-8 h-10 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setEditItem(null); setShowForm(true); }} className="h-10 gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md rounded-lg font-medium">
            <Plus className="h-4 w-4" /> 新建客户
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit} disabled={!selectedId} className="h-10 gap-2 rounded-lg font-medium hover:bg-blue-50">
            <Pencil className="h-4 w-4" /> 编辑
          </Button>
          <Button size="sm" onClick={handleDeleteWithConfirm} disabled={!selectedId} className="h-10 gap-2 bg-red-500 text-white hover:bg-red-600 shadow-md rounded-lg font-medium">
            <Trash2 className="h-4 w-4" /> 删除
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={filtered}
          selectedId={selectedId}
          onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)}
        />
      )}

      {selectedId && (
        <div className="mt-8 border-t pt-8 space-y-8">
          <ClientFinanceCard clientId={selectedId} client={clients.find(c => c.id === selectedId)} />
          <ClientOrdersPanel clientId={selectedId} />
        </div>
      )}

      <ClientForm 
        open={showForm} 
        onOpenChange={setShowForm} 
        editItem={editItem}
        onSaved={() => { setShowForm(false); setEditItem(null); loadData(); }}
      />
    </div>
  );
}