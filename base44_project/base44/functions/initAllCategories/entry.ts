import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Complete category list: comprehensive from entity, code, and dropdown
    const allCategories = [
      "大花", "巨花", "大尖头花", "小花", "栏杆", "配件", "其他",
      "板材", "扁铁", "玻璃", "不锈钢玻璃夹", "不锈钢管材",
      "不锈钢配件", "彩色Blaster", "撞钉", "底盘", "方臂",
      "焊丝", "门框", "玻璃胶", "铝材", "五金", "镜柜",
      "拉手", "合页", "导轨", "支架", "铰链", "滑轮",
      "螺钉", "螺栓", "垫片", "弹簧", "销钉", "铆钉",
      "焊材", "密封胶", "防水胶", "胶水", "漆料", "木材",
      "石材", "皮革", "布料", "塑料", "橡胶", "金属", "钢材"
    ];

    // Get existing categories
    const existing = await base44.asServiceRole.entities.Settings.filter({ key: 'material_category' });
    const existingSet = new Set(existing.map(e => e.value));

    // Find missing categories
    const toAdd = allCategories.filter(cat => !existingSet.has(cat));

    if (toAdd.length === 0) {
      return Response.json({ message: '所有类别已存在', total: allCategories.length });
    }

    // Add missing categories
    await base44.asServiceRole.entities.Settings.bulkCreate(
      toAdd.map(v => ({ key: 'material_category', value: v }))
    );

    return Response.json({
      added: toAdd.length,
      total: allCategories.length,
      categories: allCategories
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});