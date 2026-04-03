import { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Upload, Trash2, Pencil, FileSpreadsheet, ImagePlus, Settings, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import DataTable from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";

const DEFAULT_CATEGORIES = [];

const emptyForm = {
  code: "", name: "", category: "大花", image: "", weight: 0,
  size: "", specification: "", color: "", material_type: "",
  stock_quantity: 0, stock_unit: "个", factory_price: 0, purchase_price: 0,
  selling_price: 0, supplier: "", remark: ""
};

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [customCategories, setCustomCategories] = useState([]);
  const [importing, setImporting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [importProgress, setImportProgress] = useState(null); // { done, total, status }
  const [imageProgress, setImageProgress] = useState(null); // { done, total, current, matched, skipped }
  // Sheet-by-sheet confirmation state
  const [pendingSheets, setPendingSheets] = useState(null); // array of sheet objects
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
  const [sheetImporting, setSheetImporting] = useState(false); // loading for current sheet
  const [importSummary, setImportSummary] = useState([]); // per-sheet results
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [editingCat, setEditingCat] = useState(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('code_asc');
  const [catSearch, setCatSearch] = useState('');
  const [missingFilter, setMissingFilter] = useState(null); // null | 'image' | 'factory_price' | 'purchase_price' | 'selling_price'
  const [importMode, setImportMode] = useState(null); // null | 'batch' | 'sheet'
  const [pendingImportSheets, setPendingImportSheets] = useState(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, customCats] = await Promise.all([
        base44.entities.Material.list('-created_date', 2000),
        base44.entities.Settings.filter({ key: 'material_category' })
      ]);
    
      // 提取实际物料中使用的所有类别
      const actualCategories = [...new Set(data.map(m => m.category).filter(Boolean))];
      
      // 删除Settings中不在实际数据中的类别
      const customCatsMap = new Map(customCats.map(c => [c.value, c.id]));
      for (const [cat, id] of customCatsMap.entries()) {
        if (!actualCategories.includes(cat)) {
          await base44.entities.Settings.delete(id);
        }
      }
    
      // 重新加载Settings
      const updatedCats = await base44.entities.Settings.filter({ key: 'material_category' });
      
      // 如果没有类别了，初始化
      if (updatedCats.length === 0) {
        await base44.functions.invoke('resetCategories', {});
        const resetCats = await base44.entities.Settings.filter({ key: 'material_category' });
        setCustomCategories(resetCats.map(c => c.value));
      } else {
        setCustomCategories(updatedCats.map(c => c.value));
      }
      setMaterials(data);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Subscribe to material changes
  useEffect(() => {
    let timer;
    const unsubscribe = base44.entities.Material.subscribe((event) => {
      clearTimeout(timer);
      timer = setTimeout(() => loadData(), 500);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // All categories come from Settings entity
  // 从物料表中汇总所有实际存在的类别 + Settings中的自定义类别，完全去重
  const allCategoriesSet = new Set([...customCategories, ...materials.map(m => m.category).filter(Boolean)]);
  const allCategories = Array.from(allCategoriesSet).sort((a, b) => a.localeCompare(b, 'zh'));
  const displayCategories = ["全部", ...allCategories];
  
  // 确保选中的类别始终有效
  if (categoryFilter !== "全部" && !displayCategories.includes(categoryFilter)) {
    setCategoryFilter("全部");
  }

  // Missing info counts
  const missingCounts = {
    image: materials.filter(m => !m.image).length,
    factory_price: materials.filter(m => !m.factory_price).length,
    purchase_price: materials.filter(m => !m.purchase_price).length,
    selling_price: materials.filter(m => !m.selling_price).length,
  };

  // Per-category breakdown of missing info
  const getMissingCategories = (field) => {
    const cats = {};
    materials.filter(m => !m[field]).forEach(m => {
      const cat = m.category || '未分类';
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  };

  const filtered = materials.filter(m => {
    const matchSearch = !search || 
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.code?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "全部" || m.category === categoryFilter;
    const matchMissing = !missingFilter || (
      missingFilter === 'image' ? !m.image :
      missingFilter === 'factory_price' ? !m.factory_price :
      missingFilter === 'purchase_price' ? !m.purchase_price :
      missingFilter === 'selling_price' ? !m.selling_price : true
    );
    return matchSearch && matchCategory && matchMissing;
  }).sort((a, b) => {
    const [key, dir] = sortKey.endsWith('_asc') ? [sortKey.slice(0, -4), 1] : [sortKey.slice(0, -5), -1];
    const va = (a[key] ?? '').toString();
    const vb = (b[key] ?? '').toString();
    return va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' }) * dir;
  });

  const filteredCats = catSearch.trim()
    ? displayCategories.filter(c => c === '全部' || c.toLowerCase().includes(catSearch.toLowerCase()))
    : displayCategories;

  // Auto-select first matching category when searching
  useEffect(() => {
    if (catSearch.trim()) {
      const match = filteredCats.find(c => c !== '全部');
      if (match) { setCategoryFilter(match); setPage(1); }
    }
  }, [catSearch]);

  // 分页逻辑
  const pageSize = 20;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize);
  
  // 重置分页
  if (page > totalPages && totalPages > 0) {
    setPage(1);
  }

  const columns = [
    { key: "code", label: "编号", width: "180px" },
    { key: "image", label: "图片", width: "60px", render: (val) => val ? (
      <img src={val} alt="" className="h-8 w-8 object-cover rounded-lg" />
    ) : null },
    { key: "name", label: "名称", width: "280px" },
    { key: "factory_price", label: "出厂价(¥)", width: "90px", render: (val) => val ? `¥${val.toFixed(2)}` : "¥0.00" },
    { key: "purchase_price", label: "买入价($)", width: "90px", render: (val) => val ? `$${val.toFixed(2)}` : "$0.00" },
    { key: "selling_price", label: "卖出价($)", width: "90px", render: (val) => val ? `$${val.toFixed(2)}` : "$0.00" },
  ];

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast.error("编号和名称为必填项");
      return;
    }
    if (editItem) {
      await base44.entities.Material.update(editItem.id, form);
      toast.success("物料已更新");
    } else {
      await base44.entities.Material.create(form);
      toast.success("物料已创建");
    }
    setShowForm(false);
    setEditItem(null);
    setForm(emptyForm);
    loadData();
  };

  const handleEdit = () => {
    const item = materials.find(m => m.id === selectedId);
    if (!item) { toast.error("请先选择一行"); return; }
    setEditItem(item);
    setForm({
      code: item.code || "", name: item.name || "", category: item.category || "大花",
      image: item.image || "", weight: item.weight || 0, size: item.size || "",
      specification: item.specification || "", color: item.color || "",
      material_type: item.material_type || "", stock_quantity: item.stock_quantity || 0,
      stock_unit: item.stock_unit || "个", factory_price: item.factory_price || 0, purchase_price: item.purchase_price || 0,
      selling_price: item.selling_price || 0, supplier: item.supplier || "", remark: item.remark || ""
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!selectedId) { toast.error("请先选择一行"); return; }
    await base44.entities.Material.delete(selectedId);
    toast.success("物料已删除");
    setSelectedId(null);
    loadData();
  };

  // Batch image upload by filename matching material code (support _ as / separator)
  const handleBatchImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImages(true);
    const allMaterials = await base44.entities.Material.list('-created_date', 1000);
    const byCode = {};
    allMaterials.forEach(m => { if (m.code) byCode[m.code.toLowerCase()] = m; });
    let matched = 0, skipped = 0;
    const total = files.length;
    setImageProgress({ done: 0, total, current: '', matched: 0, skipped: 0 });
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let codeName = file.name.replace(/\.[^.]+$/, '').toLowerCase();
      codeName = codeName.replace(/_/g, '/');
      const mat = byCode[codeName];
      if (!mat) {
        skipped++;
        setImageProgress({ done: i + 1, total, current: file.name, matched, skipped });
        continue;
      }
      setImageProgress({ done: i, total, current: file.name, matched, skipped });
      let uploadOk = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
          const wait = 3000 * Math.pow(2, attempt - 1); // 3s, 6s, 12s
          await new Promise(r => setTimeout(r, wait));
        }
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          await base44.entities.Material.update(mat.id, { image: file_url });
          matched++;
          uploadOk = true;
          break;
        } catch (err) {
          if (err?.message?.includes('Rate limit') && attempt < 3) {
            continue; // retry
          }
          console.error('上传失败:', file.name, err);
          skipped++;
          break;
        }
      }
      // Delay between uploads to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
      setImageProgress({ done: i + 1, total, current: file.name, matched, skipped });
    }
    toast.success(`图片导入：匹配${matched}个，跳过${skipped}个`);
    loadData();
    setUploadingImages(false);
    setImageProgress(null);
    e.target.value = '';
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportProgress({ done: 0, total: 0, status: 'uploading' });
    setImportSummary([]);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImportProgress({ done: 0, total: 0, status: 'parsing' });

      const startResp = await base44.functions.invoke('importMaterials', { file_url });
      const { sheets } = startResp.data;
      if (!sheets || sheets.length === 0) {
        toast.error('未找到可导入的数据，请检查文件格式');
        return;
      }

      setPendingImportSheets(sheets);
      setImportMode(null);
    } catch (err) {
      toast.error('导入失败：' + (err?.message || '未知错误'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleBatchImportAll = async () => {
    if (!pendingImportSheets) return;
    setImportMode('batch');
    setImportProgress({ done: 0, total: 0, status: 'running' });
    setImportSummary([]);
    let totalCreated = 0, totalUpdated = 0;

    const CREATE_CHUNK = 50;
    const UPDATE_CHUNK = 5;

    for (const sheet of pendingImportSheets) {
      const { toCreate, toUpdate } = sheet;
      const total = toCreate.length + toUpdate.length;
      let done = 0;

      for (let i = 0; i < toCreate.length; i += CREATE_CHUNK) {
        const chunk = toCreate.slice(i, i + CREATE_CHUNK);
        await base44.functions.invoke('processImportChunk', { toCreate: chunk, toUpdate: [] });
        done += chunk.length;
        totalCreated += chunk.length;
        setImportProgress({ done: totalCreated + totalUpdated, total: pendingImportSheets.reduce((sum, s) => sum + s.toCreate.length + s.toUpdate.length, 0), status: 'running' });
      }

      for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK) {
        const chunk = toUpdate.slice(i, i + UPDATE_CHUNK);
        await base44.functions.invoke('processImportChunk', { toCreate: [], toUpdate: chunk });
        done += chunk.length;
        totalUpdated += chunk.length;
        setImportProgress({ done: totalCreated + totalUpdated, total: pendingImportSheets.reduce((sum, s) => sum + s.toCreate.length + s.toUpdate.length, 0), status: 'running' });
      }

      setImportSummary(prev => [...prev, { sheetName: sheet.sheetName, created: sheet.toCreate.length, updated: sheet.toUpdate.length }]);
    }

    toast.success('所有数据导入完成！');
    loadData();
    setImportMode(null);
    setPendingImportSheets(null);
  };

  const handleSheetBySheetImport = () => {
    if (!pendingImportSheets) return;
    setImportMode('sheet');
    setPendingSheets(pendingImportSheets);
    setCurrentSheetIdx(0);
    setPendingImportSheets(null);
  };

  const handleImportSheet = async (sheetIdx) => {
    const sheet = pendingSheets[sheetIdx];
    if (!sheet) return;
    setSheetImporting(true);

    const { toCreate, toUpdate } = sheet;
    const total = toCreate.length + toUpdate.length;
    setImportProgress({ done: 0, total, status: 'running' });
    let done = 0;

    const CREATE_CHUNK = 50;
    const UPDATE_CHUNK = 5;

    for (let i = 0; i < toCreate.length; i += CREATE_CHUNK) {
      const chunk = toCreate.slice(i, i + CREATE_CHUNK);
      await base44.functions.invoke('processImportChunk', { toCreate: chunk, toUpdate: [] });
      done += chunk.length;
      setImportProgress({ done, total, status: 'running' });
    }

    for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK) {
      const chunk = toUpdate.slice(i, i + UPDATE_CHUNK);
      await base44.functions.invoke('processImportChunk', { toCreate: [], toUpdate: chunk });
      done += chunk.length;
      setImportProgress({ done, total, status: 'running' });
    }

    setImportProgress({ done: total, total, status: 'done' });
    setImportSummary(prev => [...prev, { sheetName: sheet.sheetName, created: toCreate.length, updated: toUpdate.length }]);
    loadData();
    setSheetImporting(false);

    // Move to next sheet
    const nextIdx = sheetIdx + 1;
    if (nextIdx < pendingSheets.length) {
      setCurrentSheetIdx(nextIdx);
    } else {
      toast.success('所有分页导入完成！');
      setPendingSheets(null);
    }
  };

  const handleSkipSheet = (sheetIdx) => {
    const sheet = pendingSheets[sheetIdx];
    setImportSummary(prev => [...prev, { sheetName: sheet.sheetName, skipped: true }]);
    const nextIdx = sheetIdx + 1;
    if (nextIdx < pendingSheets.length) {
      setCurrentSheetIdx(nextIdx);
    } else {
      toast.success('导入流程结束');
      setPendingSheets(null);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, image: file_url }));
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    if (customCategories.includes(name)) { toast.error("类别已存在"); return; }
    await base44.entities.Settings.create({ key: "material_category", value: name });
    toast.success("类别已添加");
    setNewCategory("");
    loadData();
  };

  const handleResetCategories = async () => {
    if (window.confirm("确认要清空并重置所有类别吗？")) {
      await base44.functions.invoke('resetCategories', {});
      toast.success("类别已重置");
      loadData();
    }
  };

  const currentSheet = pendingSheets ? pendingSheets[currentSheetIdx] : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">原材料管理</h1>
          <p className="text-sm text-gray-500 mt-1">Material Management · 共 {materials.length} 条</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg" onClick={handleDelete} disabled={!selectedId}>
            <Trash2 className="h-3.5 w-3.5" /> 删除
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs rounded-lg" onClick={handleEdit} disabled={!selectedId}>
            <Pencil className="h-3.5 w-3.5" /> 编辑
          </Button>
          <Button size="sm" onClick={() => { setEditItem(null); setForm(emptyForm); setShowForm(true); }} className="gap-2 h-10 px-4 rounded-xl">
            <Plus className="h-4 w-4" /> 新增物料
          </Button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} />
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBatchImageUpload} />

      {/* Image Upload Progress Dialog */}
      <Dialog open={!!imageProgress} onOpenChange={(open) => { if (!open) { setImageProgress(null); setUploadingImages(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>批量导入图片</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>已处理 {imageProgress?.done ?? 0} 张</span>
              <span>共 {imageProgress?.total ?? 0} 张</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: imageProgress?.total > 0 ? `${Math.round((imageProgress.done / imageProgress.total) * 100)}%` : '0%' }}
              />
            </div>
            <p className="text-center text-lg font-semibold">
              {imageProgress?.total > 0 ? `${Math.round((imageProgress.done / imageProgress.total) * 100)}%` : '0%'}
            </p>
            {imageProgress?.current && (
              <p className="text-xs text-muted-foreground truncate text-center">正在处理：{imageProgress.current}</p>
            )}
            <div className="flex gap-4 justify-center text-sm">
              <span>✅ 已匹配 <strong className="text-green-600">{imageProgress?.matched ?? 0}</strong></span>
              <span>⏭️ 已跳过 <strong className="text-amber-500">{imageProgress?.skipped ?? 0}</strong></span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Uploading/Parsing Dialog */}
      <Dialog open={importing} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>正在解析文件...</DialogTitle></DialogHeader>
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              {importProgress?.status === 'uploading' ? '正在上传文件...' : '正在解析数据...'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Mode Selection Dialog */}
      <Dialog open={pendingImportSheets !== null && importMode === null} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>选择导入方式</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">已解析 {pendingImportSheets?.length ?? 0} 个数据页面</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleBatchImportAll} className="flex-1">全部一次导入</Button>
            <Button onClick={handleSheetBySheetImport} variant="outline" className="flex-1">逐页确认</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Import Progress Dialog */}
      <Dialog open={importMode === 'batch'} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>正在批次导入...</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>已导入 {importProgress?.done ?? 0} 条</span>
              <span>共 {importProgress?.total ?? 0} 条</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: importProgress?.total > 0 ? `${Math.round((importProgress.done / importProgress.total) * 100)}%` : '0%' }}
              />
            </div>
            <p className="text-center text-lg font-semibold">
              {importProgress?.total > 0 ? `${Math.round((importProgress.done / importProgress.total) * 100)}%` : '0%'}
            </p>
            {importSummary.length > 0 && (
              <div className="border rounded p-2 text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                {importSummary.map((s, i) => (
                  <p key={i}>{s.sheetName}：新增{s.created} 更新{s.updated}</p>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet-by-sheet confirmation dialog */}
      <Dialog open={!!pendingSheets && !sheetImporting} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              导入分页 ({currentSheetIdx + 1}/{pendingSheets?.length ?? 0})
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {currentSheet && (
              <>
                <p className="text-sm">当前分页：<span className="font-semibold">{currentSheet.sheetName}</span></p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>新增 <span className="font-semibold text-green-600">{currentSheet.toCreate.length}</span> 条</span>
                  <span>更新 <span className="font-semibold text-blue-600">{currentSheet.toUpdate.length}</span> 条</span>
                </div>
                {importSummary.length > 0 && (
                  <div className="border rounded p-2 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">已完成：</p>
                    {importSummary.map((s, i) => (
                      <p key={i}>{s.sheetName}：{s.skipped ? '已跳过' : `新增${s.created} 更新${s.updated}`}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleSkipSheet(currentSheetIdx)}>跳过此分页</Button>
            <Button onClick={() => handleImportSheet(currentSheetIdx)}>确认导入</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet importing progress dialog */}
      <Dialog open={sheetImporting} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>正在导入：{currentSheet?.sheetName}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>已导入 {importProgress?.done ?? 0} 行</span>
              <span>共 {importProgress?.total ?? 0} 行</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: importProgress?.total > 0 ? `${Math.round((importProgress.done / importProgress.total) * 100)}%` : '0%' }}
              />
            </div>
            <p className="text-center text-lg font-semibold">
              {importProgress?.total > 0 ? `${Math.round((importProgress.done / importProgress.total) * 100)}%` : '0%'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Layout - Left Sidebar + Right Table */}
      <div className="flex gap-4">
        {/* Left Sidebar - Filters & Tools */}
        <div className="w-80 space-y-4 flex-shrink-0">

          {/* Data Completion Suggestions */}
          {(missingCounts.image > 0 || missingCounts.factory_price > 0 || missingCounts.purchase_price > 0 || missingCounts.selling_price > 0) && (
            <Collapsible defaultOpen={false} className="border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm">
              <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-white/30 transition">
                <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
                  <span>📋</span> 数据补全建议
                </div>
                <ChevronDown className="h-4 w-4 text-blue-900 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-blue-200 p-3 space-y-2">
                {[
                  { field: 'image', label: '缺少图片', icon: '🖼️' },
                  { field: 'factory_price', label: '缺少出厂价', icon: '💰' },
                  { field: 'purchase_price', label: '缺少买入价', icon: '💵' },
                  { field: 'selling_price', label: '缺少卖出价', icon: '💳' },
                ].filter(({ field }) => missingCounts[field] > 0).map(({ field, label, icon }) => {
                  const cats = getMissingCategories(field);
                  return (
                    <div key={field} className="flex items-center gap-2 p-2 bg-white/70 rounded border border-blue-100">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs font-semibold text-blue-900">{label}</span>
                      <div className="flex flex-wrap gap-1">
                        {cats.map(([cat, cnt]) => (
                          <button key={cat} 
                            onClick={() => { setCategoryFilter(cat); setMissingFilter(field); setPage(1); }}
                            className={`px-1.5 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
                              missingFilter === field && categoryFilter === cat 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {cat} ({cnt})
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {missingFilter && (
                  <button onClick={() => { setMissingFilter(null); setCategoryFilter('全部'); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2">✕ 清除筛选</button>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Category Filter - Always Expanded */}
          <div className="border border-gray-300 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md p-4 space-y-3">
            <p className="text-sm font-bold text-gray-900 flex items-center gap-2">🏷️ 类别筛选</p>
            <div className="grid grid-cols-2 gap-2">
              {displayCategories.map(c => {
                const count = c === "全部" ? materials.length : materials.filter(m => m.category === c).length;
                const isActive = categoryFilter === c;
                return (
                  <button key={c} onClick={() => { setCategoryFilter(c); setPage(1); }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all duration-200 shadow-sm
                      ${isActive 
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-700 shadow-md" 
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{c}</span>
                      <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full font-bold" style={{color: isActive ? '#1e3a8a' : '#666'}}>{count}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side - Data Table */}
        <div className="flex-1 flex flex-col">
          {/* Search + Sort + Pagination */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            {/* Batch Buttons */}
              <Button size="sm" className="h-9 gap-2 text-xs bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm rounded-lg font-medium" onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4" /> 导入Excel
              </Button>
              <Button size="sm" className="h-9 gap-2 text-xs bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-sm rounded-lg font-medium" onClick={() => imageInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4" /> 导入图片
              </Button>
              <Button size="sm" className="h-9 gap-2 text-xs bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 shadow-sm rounded-lg font-medium" onClick={() => setShowCategoryManager(true)}>
                <Settings className="h-4 w-4" /> 类别管理
              </Button>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" />

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] shadow-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="🔍 搜索编号/名称..." className="pl-8 h-9 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            {/* Sort */}
            <Select value={sortKey} onValueChange={setSortKey}>
              <SelectTrigger className="w-32 h-9 text-xs rounded-lg border border-gray-300 bg-white shadow-sm font-medium hover:border-blue-400"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="code_asc">📝 编号 A→Z</SelectItem>
                <SelectItem value="code_desc">📝 编号 Z→A</SelectItem>
                <SelectItem value="name_asc">🏷️ 名称 A→Z</SelectItem>
                <SelectItem value="name_desc">🏷️ 名称 Z→A</SelectItem>
              </SelectContent>
            </Select>

            {/* Pagination */}
            {!loading && filtered.length > pageSize && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 rounded-lg border border-blue-200 shadow-sm">
                <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-medium hover:bg-blue-100" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← 上页</Button>
                <span className="text-xs font-semibold text-blue-700 whitespace-nowrap px-2">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-medium hover:bg-blue-100" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>下页 →</Button>
              </div>
            )}
          </div>

          {/* Data Table */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={paginatedData}
              selectedId={selectedId}
              onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)}
            />
          )}


        </div>
      </div>

      {/* Category Management Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>物料类别管理 (共 {allCategories.filter(c => c !== '全部').length} 种)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="flex gap-2 mb-3">
              <Input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="输入新类别..."
                className="h-8 text-sm rounded-lg"
                onKeyDown={e => e.key === "Enter" && handleAddCategory()}
              />
              <Button size="sm" onClick={handleAddCategory} className="h-8 rounded-lg">新增</Button>
            </div>
            {allCategories.map(cat => (
              <div key={cat} className="flex items-center gap-2 p-2.5 rounded-lg border bg-slate-50 hover:bg-slate-100 transition">
                <span className="flex-1 text-sm font-medium">{cat}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>{editItem ? "编辑物料" : "新增物料"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>编号(Code)*</Label><Input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value}))} className="rounded-lg" /></div>
            <div><Label>名称(Name)*</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="rounded-lg" /></div>
            <div>
              <Label>类别(Category)</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>{allCategories.filter(c => c !== "全部").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>单重(Weight KG)</Label><Input type="number" value={form.weight} onChange={e => setForm(p => ({...p, weight: Number(e.target.value)}))} className="rounded-lg" /></div>
            <div><Label>尺寸(Size)</Label><Input value={form.size} onChange={e => setForm(p => ({...p, size: e.target.value}))} className="rounded-lg" /></div>
            <div><Label>规格(Spec)</Label><Input value={form.specification} onChange={e => setForm(p => ({...p, specification: e.target.value}))} className="rounded-lg" /></div>
            <div><Label>颜色(Color)</Label><Input value={form.color} onChange={e => setForm(p => ({...p, color: e.target.value}))} className="rounded-lg" /></div>
            <div><Label>材料(Material)</Label><Input value={form.material_type} onChange={e => setForm(p => ({...p, material_type: e.target.value}))} className="rounded-lg" /></div>
            <div><Label>库存量(Stock)</Label><Input type="number" value={form.stock_quantity} onChange={e => setForm(p => ({...p, stock_quantity: Number(e.target.value)}))} className="rounded-lg" /></div>
            <div><Label>库存单位(Unit)</Label><Input value={form.stock_unit} onChange={e => setForm(p => ({...p, stock_unit: e.target.value}))} className="rounded-lg" /></div>
            <div><Label>出厂价(¥)</Label><Input type="number" value={form.factory_price} onChange={e => setForm(p => ({...p, factory_price: Number(e.target.value)}))} className="rounded-lg" /></div>
            <div><Label>买入价($)</Label><Input type="number" value={form.purchase_price} onChange={e => setForm(p => ({...p, purchase_price: Number(e.target.value)}))} className="rounded-lg" /></div>
            <div><Label>卖出价($)</Label><Input type="number" value={form.selling_price} onChange={e => setForm(p => ({...p, selling_price: Number(e.target.value)}))} className="rounded-lg" /></div>
            <div><Label>供应商(Supplier)</Label><Input value={form.supplier} onChange={e => setForm(p => ({...p, supplier: e.target.value}))} className="rounded-lg" /></div>
            <div>
              <Label>图片(Image)</Label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs rounded-lg" />
              {form.image && <img src={form.image} alt="" className="mt-2 h-20 w-20 object-cover rounded-lg border" />}
            </div>
            <div className="col-span-2"><Label>备注(Remark)</Label><Textarea value={form.remark} onChange={e => setForm(p => ({...p, remark: e.target.value}))} rows={2} className="rounded-lg" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-lg">取消</Button>
            <Button onClick={handleSave} className="rounded-lg">确认保存</Button>
          </div>
        </DialogContent>
        </Dialog>
        </div>
        );
        }