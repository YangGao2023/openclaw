import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取最后一个员工的 ID
    const employees = await base44.entities.Employee.list('-created_date', 1);
    
    let nextId = 'E001';
    if (employees.length > 0) {
      const lastId = employees[0].employee_id;
      const num = parseInt(lastId.substring(1)) + 1;
      nextId = 'E' + String(num).padStart(3, '0');
    }

    return Response.json({ employee_id: nextId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});