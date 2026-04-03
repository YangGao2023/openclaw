import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payrollId, amount, employeeName, employeeId, payDate } = await req.json();
    
    if (!payrollId || !amount || !employeeId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get payroll record
    const payroll = await base44.entities.Payroll.list();
    const currentPayroll = payroll.find(p => p.id === payrollId);
    
    if (!currentPayroll) {
      return Response.json({ error: 'Payroll not found' }, { status: 404 });
    }

    // Create expense record
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const expense = await base44.asServiceRole.entities.Expense.create({
      target: employeeName,
      detail: `工资发放 - ${employeeId}`,
      amount: amount,
      expense_type: "工资",
      payment_method: "现金",
      expense_date: payDate || new Date().toISOString().split('T')[0],
      is_office: true,
      remark: `${employeeName}(${employeeId}) - 发放于 ${timeStr}`
    });

    // Update payroll status
    await base44.asServiceRole.entities.Payroll.update(payrollId, {
      status: "已发放",
      paid_date: payDate || new Date().toISOString().split('T')[0]
    });

    return Response.json({
      success: true,
      expense_id: expense.id,
      amount: amount,
      message: `已发放 ¥${amount.toFixed(2)}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});