import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import DataTable from "./DataTable";

export default function MaterialSelector({ open, onOpenChange, onSelect }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [selectedId, setSelectedId] = useState(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [isReturn, setIsReturn] = useState(false);

  useEffect(() => {
    if (open) loadMaterials();
  }, [open]);

  const loadMaterials = async () => {
    setLoading(true);
    const data = await base44.entities.Material.list('-created_date', 1000);
    setMaterials(data);
    setLoading(false);
  };

  const allCategoriesSet = new Set(materials.map(m => m.category).filter(Boolean));
  const allCategories = ["全部", ...Array.from(allCategoriesSet).sort((a, b) => a.localeCompare(b, 'zh'))];

  const filtered = materials.filter(m => {
    const matchSearch = !search || m.code?.toLowerCase().includes(search.toLowerCase()) || m.name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "全部" || m.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleSelectMaterial = (mat) => {
    setSelectedMaterial(mat);
    setQuantity("");
    setIsReturn(false);
    setShowConfigDialog(true);
  };

  const handleConfirm = () => {
    if (!quantity || Number(quantity) === 0) {
      toast.error("请输入数量");
      return;
    }
    if (selectedMaterial) {
      const qty = Number(quantity);
      onSelect({
        material_id: selectedMaterial.id,
        material_code: selectedMaterial.code,
        material_name: selectedMaterial.name,
        category: selectedMaterial.category,
        weight: selectedMaterial.weight || 0,
        size: selectedMaterial.size || "",
        specification: selectedMaterial.specification || "",
        color: selectedMaterial.color || "",
        material_type: selectedMaterial.material_type || "",
        quantity: isReturn ? -qty : qty,
        unit_price: selectedMaterial.selling_price || 0,
        operation_type: isReturn ? "退货" : "订货"
      });
      setSelectedId(null);
      setSelectedMaterial(null);
      setQuantity("");
      setIsReturn(false);
      setSearch("");
      setShowConfigDialog(false);
      onOpenChange(false);
    }
  };

  const columns = [
    { key: "code", label: "编号", width: "90px" },
    { key: "image", label: "图", width: "50px", render: (val) => val ? (
      <img src={val} alt="" className="h-8 w-8 object-cover rounded" />
    ) : null },
    { key: "name", label: "名称", width: "150px" },
    { key: "selling_price", label: "卖出价($)", width: "90px", render: (v) => `$${v?.toFixed(2) || "0"}` },
    { key: "stock_quantity", label: "库存", width: "70px" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto pb-24">
        <DialogHeader>
          <DialogTitle>选择物料</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索编号或名称..."
              className="max-w-xs"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">类别:</span>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
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
              onRowClick={(row) => handleSelectMaterial(row)}
              emptyText="暂无物料"
            />
            )}


        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={() => onOpenChange(false)} variant="outline">关闭</Button>
        </div>
      </DialogContent>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>配置物料 - {selectedMaterial?.code}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>出厂价 (¥)</Label>
              <Input
                type="number"
                value={selectedMaterial?.factory_price || 0}
                disabled
                className="bg-slate-50"
              />
            </div>
            <div>
              <Label>买入价 ($)</Label>
              <Input
                type="number"
                value={selectedMaterial?.purchase_price || 0}
                disabled
                className="bg-slate-50"
              />
            </div>
            <div>
              <Label>卖出价 ($) - 批发单价</Label>
              <Input
                type="number"
                value={selectedMaterial?.selling_price || 0}
                disabled
                className="bg-slate-50"
              />
            </div>

            <div>
              <Label>批发数量 (Amount)</Label>
              <Input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">负数表示退货</p>
            </div>

            <div className="space-y-2">
              <Label>操作类型</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sell"
                    checked={!isReturn}
                    onCheckedChange={() => setIsReturn(false)}
                  />
                  <Label htmlFor="sell" className="font-normal cursor-pointer">卖货</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="return"
                    checked={isReturn}
                    onCheckedChange={() => setIsReturn(true)}
                  />
                  <Label htmlFor="return" className="font-normal cursor-pointer">退货</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => { setShowConfigDialog(false); setSelectedMaterial(null); }} variant="outline">取消</Button>
            <Button onClick={handleConfirm}>确定</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}