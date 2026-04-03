import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 获取所有在职员工
    const employees = await base44.entities.Employee.filter({ status: '在职' });
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();

    for (const emp of employees) {
      // 检查该员工今天是否应该上班
      if (!emp.work_schedule || !emp.work_schedule.includes(dayOfWeek)) {
        continue;
      }

      // 检查今天是否已有出勤记录
      const existing = await base44.entities.Attendance.filter({
        employee_id: emp.employee_id,
        attendance_date: today
      });

      if (existing.length === 0) {
        // 创建出勤记录
        await base44.entities.Attendance.create({
          employee_id: emp.employee_id,
          employee_name: emp.name,
          attendance_date: today,
          status: '出勤',
          leave_hours: 0,
          leave_minutes: 0,
          overtime_hours: 0,
          overtime_minutes: 0
        });
      }
    }

    return Response.json({ success: true, processed: employees.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});