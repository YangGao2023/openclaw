import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Plus, Minus, Trash2, Receipt, Scale } from "lucide-react";
import { toast } from "sonner";

export default function QuoteCalculator() {
  const [selectedItems, setSelectedItems] = useState([]);
  const [laborMultiplier, setLaborMultiplier] = useState(1.5);

  // 获取所有物料数据
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: () => base44.entities.Material.list(),
  });

  // 添加物料到计算清单 (加号逻辑)
  const addItem = (material) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === material.id);
      if (exists) {
        return prev.map((i) =>
          i.id === material.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...material, quantity: 1 }];
    });
  };

  // 减少物料数量 (减号逻辑)
  const decreaseQuantity = (id) => {
    setSelectedItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item && item.quantity > 1) {
        return prev.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  // 彻底移除物料
  const removeItem = (id) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  };

  // 修改数量
  const updateQuantity = (id, qty) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(0.1, parseFloat(qty) || 0) } : i))
    );
  };

  // 计算总成本
  const totals = useMemo(() => {
    const materialCost = selectedItems.reduce((sum, item) => {
      const price = item.unit_type === "尺" || item.unit_type === "寸" 
        ? (item.selling_price / (item.length_per_unit || 1)) 
        : (item.selling_price || 0);
      return sum + price * item.quantity;
    }, 0);

    const totalQuote = materialCost * laborMultiplier;
    return { materialCost, totalQuote };
  }, [selectedItems, laborMultiplier]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="定制产品报价模拟器" 
        subtitle="基于实时库房成本与加工系数进行智能开价"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              库房物料选择
            </CardTitle>
            <CardDescription>点击下方物料，将其加入报价清单</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
              {materials.map((m) => (
                <div 
                  key={m.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => addItem(m)}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground">编号: {m.code} | 单位: {m.unit_type || '个'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-primary">${m.selling_price}</span>
                    <Plus className="h-4 w-4 ml-2 inline opacity-30" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2 text-primary font-black">
                <Calculator className="h-5 w-5" />
                报价汇总 (实时)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2 border-b pb-4">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">人工及利润系数 (Labor Multiplier)</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={laborMultiplier} 
                    onChange={(e) => setLaborMultiplier(parseFloat(e.target.value))}
                    className="h-12 text-lg font-bold"
                  />
                  <span className="text-xs text-muted-foreground w-32">建议: 简单1.5, 复杂2.2</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span>物料原始成本:</span>
                  <span className="font-mono font-bold">${totals.materialCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-dashed">
                  <span className="font-bold text-lg">最终建议报价:</span>
                  <span className="text-3xl font-black text-primary tracking-tighter">
                    ${totals.totalQuote.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button className="w-full h-12 gap-2 mt-4" size="lg" onClick={() => toast.success("正在生成订单草稿...")}>
                <Receipt className="h-5 w-5" />
                一键转为正式订单
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">已选清单 ({selectedItems.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[10px]">物料名称</TableHead>
                    <TableHead className="text-[10px]">数量/长度</TableHead>
                    <TableHead className="text-[10px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-medium py-2">{item.name}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => decreaseQuantity(item.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input 
                            type="number" 
                            className="h-7 w-12 text-xs px-1 text-center" 
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => addItem(item)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-8">
                        尚未选择任何物料
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
