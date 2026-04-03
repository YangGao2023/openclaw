import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  // 必须是采购逻辑
  if (body.type === '物料采购' || body.category === '采购') {
    const amount = Number(body.amount || 0);
    const supplier = body.supplier || '未知供应商';
    const date = body.date || new Date().toISOString().split('T')[0];

    // 在 Expense 表中生成记录
    await base44.asServiceRole.entities.Expense.create({
      expense_type: '物料采购',
      amount: amount,
      expense_date: date,
      target: supplier,
      detail: body.detail || `从 ${supplier} 采购物料`,
      payment_method: body.payment_method || '转账',
      remark: '系统自动生成 - 采购挂钩',
    });

    // 联动 CashFlow
    await base44.asServiceRole.entities.CashFlow.create({
      flow_type: '转出',
      amount: amount,
      flow_date: date,
      source_type: '采购支出',
      remark: `采购支出: ${supplier}`,
    });
  }

  return Response.json({ success: true });
});
