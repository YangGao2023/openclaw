import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ALL_CATEGORIES = [
  "大花", "巨花", "大尖头花", "小花", "栏杆", "配件", "其他",
  "底盘", "耳存", "方臂", "方通", "工具", "管材", "焊丝", "红和皮", "花和叶子",
  "板材", "扁铁", "玻璃", "不锈钢玻璃", "不锈钢管", "不锈钢配件", "彩色blaster", "摇炳",
  "机器", "尖头", "角铁", "脚盖", "铁铁或合页", "栏杆门", "轮子", "螺丝",
  "门活", "面管", "座具", "切管子", "双层", "锁", "铁支",
  "网", "尾巴", "锡牛", "油漆", "圆管", "长花", "杜盖头", "柱子",
  "钻石", "Blauster"
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch existing categories
    const existing = await base44.entities.Settings.filter({ key: 'material_category' });
    const existingValues = new Set(existing.map(e => e.value));

    // Add missing categories
    const toAdd = ALL_CATEGORIES.filter(cat => !existingValues.has(cat));
    if (toAdd.length > 0) {
      await base44.entities.Settings.bulkCreate(
        toAdd.map(v => ({ key: 'material_category', value: v }))
      );
    }

    return Response.json({ added: toAdd.length, total: ALL_CATEGORIES.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});