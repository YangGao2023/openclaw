import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FRESH_CATEGORIES = [
  "布料", "彩色Blaster", "撞钉", "大花", "大尖头花", "强簧", "导轨", "底盘", "垫片", "耳钉"
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 删除所有现有category
    const existing = await base44.asServiceRole.entities.Settings.filter({ key: "material_category" });
    for (const record of existing) {
      await base44.asServiceRole.entities.Settings.delete(record.id);
    }

    // 批量创建新的categories
    const newRecords = FRESH_CATEGORIES.map(cat => ({
      key: "material_category",
      value: cat
    }));
    await base44.asServiceRole.entities.Settings.bulkCreate(newRecords);

    return Response.json({ 
      success: true, 
      message: `已重置${FRESH_CATEGORIES.length}个类别`,
      categories: FRESH_CATEGORIES 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});