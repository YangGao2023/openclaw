import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import ExcelJS from 'npm:exceljs@4.4.0';

const HEADER_MAP = {
  '编号': 'code', '代码': 'code',
  '类别': 'category',
  '名称': 'name', '品名': 'name',
  '单重': 'weight', '重量': 'weight',
  '尺寸': 'size', '规格': 'specification',
  '颜色': 'color',
  '材料': 'material_type', '材质': 'material_type',
  '库存量': 'stock_quantity', '库存': 'stock_quantity',
  '库存单位': 'stock_unit', '单位': 'stock_unit',
  '出厂价': 'factory_price',
  '买入价': 'purchase_price', '进价': 'purchase_price', '购进价': 'purchase_price', '成本价': 'purchase_price',
  '卖出价': 'selling_price', '售出价': 'selling_price', '销售价': 'selling_price', '零售价': 'selling_price', '售价': 'selling_price',
  '备注': 'remark', '说明': 'remark',
  '供应商': 'supplier', '厂商': 'supplier',
};

function getCellText(cell) {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'object') {
    if (cell.text !== undefined) return String(cell.text).trim();
    if (cell.result !== undefined) return String(cell.result).trim();
    if (cell.richText) return cell.richText.map(r => r.text || '').join('').trim();
  }
  return String(cell).trim();
}

function normalizeHeaderText(text) {
  // 移除(xxx)或 (xxx)后缀
  return text.replace(/\s*\([^)]*\)\s*$/g, '').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const fileResp = await fetch(file_url);
    if (!fileResp.ok) return Response.json({ error: 'Failed to download file' }, { status: 400 });
    const arrayBuffer = await fileResp.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Get all existing materials for comparison
    const existing = await base44.asServiceRole.entities.Material.list('-created_date', 2000);
    const byCode = {};
    existing.forEach(m => { if (m.code) byCode[m.code.toLowerCase()] = m; });

    const COMPARE_FIELDS = ['name','category','weight','size','specification','color','material_type','stock_quantity','stock_unit','factory_price','purchase_price','selling_price','supplier','remark'];

    // Parse each sheet separately
    const sheets = [];

    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name;
      let headerColMap = null;
      let headerRowNum = 0;

      worksheet.eachRow((row, rowNumber) => {
        if (headerColMap) return;
        const values = row.values;
        for (let i = 1; i < values.length; i++) {
          const text = getCellText(values[i]);
          if (text === '编号' || text.toLowerCase() === 'code') {
            headerColMap = {};
            headerRowNum = rowNumber;
            for (let j = 1; j < values.length; j++) {
              const rawText = getCellText(values[j]);
              const headerText = normalizeHeaderText(rawText);
              if (HEADER_MAP[headerText]) headerColMap[j] = HEADER_MAP[headerText];
            }
            break;
          }
        }
      });

      if (!headerColMap) continue;

      const sheetItems = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNum) return;
        const values = row.values;
        const item = { category: sheetName };
        for (const [colIdx, fieldName] of Object.entries(headerColMap)) {
          const colNum = parseInt(colIdx);
          if (colNum >= values.length) continue;
          const cell = values[colNum];
          let val = getCellText(cell);
          if (!val) continue;
          if (['weight', 'stock_quantity', 'factory_price', 'purchase_price', 'selling_price'].includes(fieldName)) {
            const num = parseFloat(val);
            item[fieldName] = isNaN(num) ? 0 : num;
          } else {
            item[fieldName] = val;
          }
        }
        if (!item.code) return;
        if (!item.name) item.name = item.code;
        sheetItems.push(item);
      });

      const toCreate = [];
      const toUpdate = [];

      for (const item of sheetItems) {
        const key = item.code.toLowerCase();
        if (byCode[key]) {
          const ex = byCode[key];
          const hasChange = COMPARE_FIELDS.some(f => String(item[f] ?? '') !== String(ex[f] ?? ''));
          if (hasChange) toUpdate.push({ id: ex.id, data: item });
        } else {
          toCreate.push(item);
        }
      }

      if (toCreate.length > 0 || toUpdate.length > 0) {
        sheets.push({ sheetName, toCreate, toUpdate });
      }
    }

    // Collect all unique categories from parsed items
    const allCategories = new Set();
    for (const sheet of sheets) {
      for (const item of sheet.toCreate) {
        if (item.category) allCategories.add(item.category);
      }
      for (const item of sheet.toUpdate) {
        if (item.data.category) allCategories.add(item.data.category);
      }
    }

    // Auto-add missing categories to Settings
    if (allCategories.size > 0) {
      const existing = await base44.asServiceRole.entities.Settings.filter({ key: 'material_category' });
      const existingValues = new Set(existing.map(e => e.value));
      const toAdd = Array.from(allCategories).filter(cat => !existingValues.has(cat));
      if (toAdd.length > 0) {
        await base44.asServiceRole.entities.Settings.bulkCreate(
          toAdd.map(v => ({ key: 'material_category', value: v }))
        );
      }
    }

    return Response.json({ sheets });
  } catch (error) {
    console.error('[importMaterials] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});