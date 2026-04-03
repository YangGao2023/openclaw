import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 获取最后一个订单的编号
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 1);
    let nextNum = 30001;
    
    if (orders.length > 0) {
      const lastNum = parseInt(orders[0].order_number);
      if (!isNaN(lastNum) && lastNum >= 30001) {
        nextNum = lastNum + 1;
      }
    }

    return Response.json({ order_number: String(nextNum) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});