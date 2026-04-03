import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * 考勤工资自动计算触发器
 * 由 Attendance entity automation (create/update) 调用
 * 根据 Employee.daily_rate 和 meal_allowance 自动写入 daily_wage
 */

Deno.serve(async (req) => {
  const body = await req.json();
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // 从 automation payload 取 attendance 数据
  const attendanceData = body.data;
  const attendanceId = body.event?.entity_id;

  if (!attendanceData || !attendanceId) {
    return Response.json({ skipped: true, reason: 'no attendance data' });
  }

  const employeeId = attendanceData.employee_id;
  if (!employeeId) {
    return Response.json({ skipped: true, reason: 'no employee_id' });
  }

  // 查找员工信息
  const employees = await db.Employee.filter({ employee_id: employeeId });
  if (employees.length === 0) {
    return Response.json({ skipped: true, reason: 'employee not found' });
  }
  const emp = employees[0];

  // 计算工作小时（若有打卡时间）
  let workHours = Number(attendanceData.work_hours || 0);
  if (attendanceData.check_in_time && attendanceData.check_out_time) {
    const parseTime = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h + m / 60;
    };
    const inH = parseTime(attendanceData.check_in_time);
    const outH = parseTime(attendanceData.check_out_time);
    workHours = outH > inH ? outH - inH : 0;
  }

  // 计算当日工资
  const dailyRate = Number(emp.daily_rate || 0);
  const hourlyRate = Number(emp.hourly_rate || 0);
  const mealAllowance = emp.meal_allowance !== false;
  const mealAmount = mealAllowance ? Number(emp.meal_allowance_amount || 0) : 0;

  let baseWage = 0;
  if (dailyRate > 0) {
    baseWage = dailyRate;
  } else if (hourlyRate > 0 && workHours > 0) {
    baseWage = hourlyRate * workHours;
  }

  // 加班奖金（超过8小时部分，日薪制按比例计算）
  const overtimeHours = Number(attendanceData.overtime_hours || 0);
  let overtimeBonus = 0;
  if (overtimeHours > 0 && hourlyRate > 0) {
    overtimeBonus = overtimeHours * hourlyRate * 1.5;
  }

  // 请假扣款
  const leaveHours = Number(attendanceData.leave_hours || 0);
  let leaveDeduction = 0;
  if (leaveHours > 0 && hourlyRate > 0) {
    leaveDeduction = leaveHours * hourlyRate;
  } else if (leaveHours > 0 && dailyRate > 0) {
    leaveDeduction = (leaveHours / 8) * dailyRate;
  }

  const dailyWage = Math.max(0, baseWage + mealAmount + overtimeBonus - leaveDeduction);

  // 更新 Attendance 记录
  await db.Attendance.update(attendanceId, {
    work_hours: workHours,
    meal_amount: mealAmount,
    daily_wage: dailyWage,
    meal_subsidy: mealAllowance,
  });

  return Response.json({
    success: true,
    attendance_id: attendanceId,
    employee: emp.name,
    work_hours: workHours,
    base_wage: baseWage,
    meal_amount: mealAmount,
    overtime_bonus: overtimeBonus,
    leave_deduction: leaveDeduction,
    daily_wage: dailyWage,
  });
});