import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * 全局数据汇总视图
 * 返回：当月收入/支出、逾期订单、库存预警
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // 当月起止
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = nextMonth.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  // 并行拉取所有需要的数据
  const [orders, expenses, paymentRecords, materials] = await Promise.all([
    db.Order.list('-order_date', 1000),
    db.Expense.list('-expense_date', 1000),
    db.PaymentRecord.list('-payment_date', 1000),
    db.Material.list('name', 500),
  ]);

  // ── 当月收入（已结清/结清订单的 amount_paid）─────────────────
  const monthPayments = paymentRecords.filter(p => {
    const d = p.payment_date || p.created_date || '';
    return d >= monthStart && d < monthEnd && p.type === '收款';
  });
  const monthRefunds = paymentRecords.filter(p => {
    const d = p.payment_date || p.created_date || '';
    return d >= monthStart && d < monthEnd && p.type === '退款';
  });
  const monthIncome = monthPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
                    - monthRefunds.reduce((s, p) => s + Number(p.amount || 0), 0);

  // ── 当月支出（采购+工资+其他）────────────────────────────────
  const monthExpenses = expenses.filter(e => {
    const d = e.expense_date || e.created_date || '';
    return d >= monthStart && d < monthEnd;
  });
  const expenseByType = {};
  let monthTotalExpense = 0;
  for (const e of monthExpenses) {
    const t = e.expense_type || '其他';
    expenseByType[t] = (expenseByType[t] || 0) + Number(e.amount || 0);
    monthTotalExpense += Number(e.amount || 0);
  }

  // ── 逾期未结清订单（余款 > 0 且状态不是已结清/已关闭）─────────
  const overdueOrders = orders
    .filter(o => Number(o.balance || 0) > 0 && !['结清', '已结清', '已关闭'].includes(o.status))
    .map(o => ({
      order_id:    o.id,
      order_number: o.order_number,
      client_name: o.client_name,
      total_price: o.total_price,
      amount_paid: o.amount_paid,
      balance:     o.balance,
      status:      o.status,
      order_date:  o.order_date,
    }));

  // ── 库存预警（stock_quantity < 5）────────────────────────────
  const lowStockMaterials = materials
    .filter(m => Number(m.stock_quantity || 0) < 5)
    .map(m => ({
      id:             m.id,
      code:           m.code,
      name:           m.name,
      stock_quantity: m.stock_quantity,
      unit:           m.unit || m.stock_unit,
    }));

  return Response.json({
    success: true,
    generated_at: now.toISOString(),
    period: { start: monthStart, end: monthEnd },
    summary: {
      month_income:         monthIncome,
      month_total_expense:  monthTotalExpense,
      expense_by_type:      expenseByType,
      net_cashflow:         monthIncome - monthTotalExpense,
    },
    overdue_orders: {
      count:  overdueOrders.length,
      total_balance: overdueOrders.reduce((s, o) => s + Number(o.balance || 0), 0),
      orders: overdueOrders,
    },
    low_stock_alert: {
      count:     lowStockMaterials.length,
      threshold: 5,
      materials: lowStockMaterials,
    },
  });
});