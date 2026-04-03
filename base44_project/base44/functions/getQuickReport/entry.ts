import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    // 1. 本月已收货款总计
    const payments = await base44.asServiceRole.entities.PaymentRecord.filter({
      payment_date: { $startsWith: currentMonth },
      type: '收款'
    });
    const totalIncome = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 2. 本月物料采购总支出
    const purchases = await base44.asServiceRole.entities.Expense.filter({
      expense_date: { $startsWith: currentMonth },
      expense_type: '物料采购'
    });
    const totalPurchase = purchases.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 3. 本月已发员工工资总计
    const payrolls = await base44.asServiceRole.entities.Payroll.filter({
      payroll_date: { $startsWith: currentMonth }
    });
    const totalPayroll = payrolls.reduce((sum, pr) => sum + (Number(pr.amount) || 0), 0);

    return Response.json({
      month: currentMonth,
      summary: {
        total_income: Number(totalIncome.toFixed(2)),
        total_purchase: Number(totalPurchase.toFixed(2)),
        total_payroll: Number(totalPayroll.toFixed(2))
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
