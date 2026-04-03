import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_id, start_date, end_date } = await req.json();

    // 获取该期间的出勤记录
    const attendances = await base44.entities.Attendance.filter({
      employee_id,
      attendance_date: { $gte: start_date, $lte: end_date }
    });

    const employee = (await base44.entities.Employee.filter({ employee_id }))[0];
    const settings = await base44.entities.Settings.list();

    // 解析设置
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    const mealSubsidy = parseFloat(settingsMap['hr_meal_subsidy'] || 0);
    const overtimeRate = parseFloat(settingsMap['hr_overtime_rate'] || 1.5);
    const leaveRate = parseFloat(settingsMap['hr_leave_rate'] || 0.5);

    let attendance_days = 0;
    let total_leave_hours = 0;
    let total_overtime_hours = 0;
    let meal_subsidy_amount = 0;

    for (const record of attendances) {
      if (record.status === '出勤') {
        attendance_days++;

        // 计算请假总小时
        const leaveHours = record.leave_hours + (record.leave_minutes || 0) / 60;

        // 请假 >= 5小时，取消饭补
        if (leaveHours < 5 && employee.meal_allowance) {
          meal_subsidy_amount += mealSubsidy;
        }

        total_leave_hours += leaveHours;
        total_overtime_hours += record.overtime_hours + (record.overtime_minutes || 0) / 60;
      }
    }

    // 计算工资
    const attendance_salary = attendance_days * employee.daily_rate;
    const leave_deduction = (total_leave_hours / 10) * employee.daily_rate * leaveRate;
    const overtime_bonus = (total_overtime_hours / 8) * employee.daily_rate * overtimeRate;
    const expected_salary = attendance_salary - leave_deduction + overtime_bonus + meal_subsidy_amount;

    return Response.json({
      attendance_days,
      total_leave_hours,
      total_overtime_hours,
      meal_subsidy_amount,
      leave_deduction,
      overtime_bonus,
      expected_salary
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});