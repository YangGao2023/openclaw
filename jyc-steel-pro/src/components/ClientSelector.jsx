import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "./DataTable";

export default function ClientSelector({ open, onOpenChange, onSelect }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  const loadClients = async () => {
    setLoading(true);
    const data = await base44.entities.Client.list('-created_date', 500);
    setClients(data);
    setLoading(false);
  };

  const filtered = clients.filter(c => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(searchLower) ||
      c.address?.toLowerCase().includes(searchLower) ||
      c.contact?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(start, start + itemsPerPage);

  const columns = [
    { key: "name", label: "名称(Name)", width: "120px" },
    { key: "address", label: "地址(Address)", width: "150px" },
    { key: "email", label: "邮箱(Email)", width: "150px" },
    { key: "contact", label: "电话(Phone)", width: "120px" },
    { key: "balance", label: "账户余额(Balance)", width: "100px", render: (v) => `$${v?.toFixed(2) || 0}` },
  ];

  const handleRowClick = (row) => {
    onSelect(row);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2 mb-1">
          <DialogTitle>选择客户(Select Client)</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 flex flex-col h-full">
          {/* 搜索框 */}
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="搜索客户名称、地址或电话..."
              className="flex-1 h-9"
            />
            <Search className="h-9 w-9 text-muted-foreground" />
          </div>

          {/* 客户列表 */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={paginatedData}
                onRowClick={handleRowClick}
                emptyText="暂无客户"
              />

              {filtered.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    显示 {start + 1} - {Math.min(start + itemsPerPage, filtered.length)} / {filtered.length} 个客户
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{currentPage} / {totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}