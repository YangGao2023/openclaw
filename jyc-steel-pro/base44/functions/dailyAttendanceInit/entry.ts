import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get today's date in New York timezone
    const nowNY = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = nowNY.getFullYear();
    const month = String(nowNY.getMonth() + 1).padStart(2, '0');
    const day = String(nowNY.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    // 0=Sunday, 1=Monday ... 6=Saturday
    const todayDayOfWeek = nowNY.getDay();

    // Get all active employees
    const employees = await base44.asServiceRole.entities.Employee.filter({ status: "\u5728\u804c" });

    // Check which employees already have attendance records for today
    const existingRecords = await base44.asServiceRole.entities.Attendance.filter({ attendance_date: today });
    const existingEmployeeIds = new Set(existingRecords.map(r => r.employee_id));

    // Create attendance records only for employees scheduled to work today
    const toCreate = employees
      .filter(emp => {
        if (existingEmployeeIds.has(emp.employee_id)) return false;
        if (!emp.work_schedule || emp.work_schedule.length === 0) return true;
        return emp.work_schedule.includes(todayDayOfWeek);
      })
      .map(emp => ({
        employee_id: emp.employee_id,
        employee_name: emp.name,
        attendance_date: today,
        leave_hours: 0,
        overtime_hours: 0,
        meal_subsidy: emp.meal_allowance !== false
      }));

    if (toCreate.length > 0) {
      await base44.asServiceRole.entities.Attendance.bulkCreate(toCreate);
    }

    return Response.json({ success: true, created: toCreate.length, date: today, dayOfWeek: todayDayOfWeek });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});