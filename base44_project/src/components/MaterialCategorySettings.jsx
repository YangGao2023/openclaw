import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

const SEED_CATEGORIES = ["大花", "巨花", "大尖头花", "小花", "栏杆", "配件", "其他"];

export default function MaterialCategorySettings() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const loadCategories = async () => {
    setLoading(true);
    let data = await base44.entities.Settings.filter({ key: "material_category" });
    // Seed defaults if none exist
    if (data.length === 0) {
      await Promise.all(SEED_CATEGORIES.map(v => base44.entities.Settings.create({ key: "material_category", value: v })));
      data = await base44.entities.Settings.filter({ key: "material_category" });
    }
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => { loadCategories(); }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (categories.some(c => c.value === name)) { toast.error("类别已存在"); return; }
    await base44.entities.Settings.create({ key: "material_category", value: name });
    toast.success("类别已添加");
    setNewName("");
    loadCategories();
  };

  const handleDelete = async (id, categoryValue) => {
    // Check if any materials use this category
    const usingMaterials = await base44.entities.Material.filter({ category: categoryValue });
    if (usingMaterials.length > 0) {
      toast.error(`此类别有 ${usingMaterials.length} 个物料使用，请先删除这些物料`);
      return;
    }
    await base44.entities.Settings.delete(id);
    toast.success("类别已删除");
    loadCategories();
  };

  const handleEditSave = async () => {
    const name = editName.trim();
    if (!name) return;
    await base44.entities.Settings.update(editId, { value: name });
    toast.success("类别已更新");
    setEditId(null);
    setEditName("");
    loadCategories();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="输入新类别名称..."
          className="max-w-xs"
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> 添加
        </Button>
      </div>

      {loading ? (
        <div className="py-4 flex justify-center">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
              {editId === cat.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-7 text-sm flex-1 max-w-xs"
                    onKeyDown={e => e.key === "Enter" && handleEditSave()}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEditSave}>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{cat.value}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditId(cat.id); setEditName(cat.value); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(cat.id, cat.value)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}