import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * 采购单已付款 → 自动生成 CashFlow 支出记录
 * 由 PurchaseOrder entity automation (update, 条件: payment_status=已付款) 调用
 */

Deno.serve(async (req) => {
  const body = await req.json();
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const poData = body.data;
  const oldData = body.old_data;
  const poId = body.event?.entity_id;

  if (!poData || !poId) {
    return Response.json({ skipped: true, reason: 'no PO data' });
  }

  // 只在状态从非"已付款"变为"已付款"时触发
  if (poData.payment_status !== '已付款') {
    return Response.json({ skipped: true, reason: 'not paid status' });
  }
  if (oldData && oldData.payment_status === '已付款') {
    return Response.json({ skipped: true, reason: 'already was paid, no duplicate' });
  }

  const amount = Number(poData.total_amount || 0);
  if (amount <= 0) {
    return Response.json({ skipped: true, reason: 'amount is zero' });
  }

  const flowDate = poData.order_date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  // 生成 CashFlow 支出记录
  const cashFlow = await db.CashFlow.create({
    flow_type:   '转出',
    amount:      amount,
    flow_date:   flowDate,
    source_type: '支出退款',
    source_id:   poId,
    remark:      `进货采购 - PO#${poData.po_number || poId} ${poData.supplier_name || ''}`,
  });

  // 同步写入 Expense 记录（归类"进货采购"）
  await db.Expense.create({
    target:          poData.supplier_name || '',
    detail:          `采购单 PO#${poData.po_number || poId}`,
    amount:          amount,
    expense_type:    '进货采购',
    payment_method:  '转账',
    expense_date:    flowDate,
    remark:          `自动生成 - 采购单已付款`,
  });

  // 更新采购单关联支出ID
  await db.PurchaseOrder.update(poId, { expense_id: cashFlow.id });

  return Response.json({
    success: true,
    po_id: poId,
    po_number: poData.po_number,
    cashflow_id: cashFlow.id,
    amount,
  });
});