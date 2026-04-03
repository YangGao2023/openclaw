import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // 验证密钥
  const authHeader = req.headers.get('Authorization') || '';
  const secret = Deno.env.get('ORDER_WEBHOOK_SECRET');
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized: invalid secret' }, { status: 401 });
  }

  const body = await req.json();

  // 必填字段校验
  if (!body.order_type || !body.client_name) {
    return Response.json({
      error: 'Missing required fields: order_type, client_name'
    }, { status: 400 });
  }

  const validTypes = ['定制单', '批发单'];
  if (!validTypes.includes(body.order_type)) {
    return Response.json({
      error: `order_type must be one of: ${validTypes.join(', ')}`
    }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  // 1. 自动生成递增订单号
  const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 1);
  let nextNumber = 30001;
  if (allOrders.length > 0) {
    const allForMax = await base44.asServiceRole.entities.Order.list('created_date', 500);
    const nums = allForMax
      .map(o => parseInt(o.order_number))
      .filter(n => !isNaN(n));
    if (nums.length > 0) {
      nextNumber = Math.max(...nums) + 1;
    }
  }
  const orderNumber = String(nextNumber);

  // 2. 查找或新建客户
  const clients = await base44.asServiceRole.entities.Client.filter({ name: body.client_name });
  let clientId = '';

  const clientFields = {
    contact: body.phone   || undefined,
    email:   body.email   || undefined,
    address: body.address || undefined,
    remark:  body.remark  || undefined,
  };
  Object.keys(clientFields).forEach(k => clientFields[k] === undefined && delete clientFields[k]);

  if (clients.length > 0) {
    clientId = clients[0].id;
    if (Object.keys(clientFields).length > 0) {
      await base44.asServiceRole.entities.Client.update(clientId, clientFields);
    }
  } else {
    const newClient = await base44.asServiceRole.entities.Client.create({
      name: body.client_name,
      type: '客户',
      ...clientFields,
    });
    clientId = newClient.id;
  }

  const nyDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  // 3. 价格处理逻辑
  let calculatedTotalPrice = Number(body.total_price || 0);
  const items = body.order_items || [];

  if (body.order_type === '批发单' && items.length > 0) {
    let sum = 0;
    for (const item of items) {
      if (item.material_code) {
        // 强制从物料库同步单价，确保唯一来源
        const materials = await base44.asServiceRole.entities.Material.filter({ code: item.material_code });
        if (materials.length > 0) {
          const price = materials[0].selling_price || 0;
          item.unit_price = price; // 覆盖任何可能的手动输入
          sum += price * (item.quantity || 1);
        }
      } else if (item.unit_price > 0) {
        // 如果没传 code 但有单价（兼容性考虑），累加到总额
        sum += item.unit_price * (item.quantity || 1);
      }
    }
    if (sum > 0) calculatedTotalPrice = sum;
  }

  const orderData = {
    order_number:      orderNumber,
    order_type:        body.order_type,
    client_name:       body.client_name,
    client_id:         clientId,
    phone:             body.phone              || '',
    address:           body.address            || '',
    description:       body.description        || '',
    total_price:       calculatedTotalPrice,
    deposit:           Number(body.deposit     || 0),
    amount_paid:       Number(body.amount_paid || 0),
    balance:           Number(body.balance     || 0),
    payment_method:    body.payment_method     || '现金',
    is_office:         body.is_office          || false,
    tax_rate:          Number(body.tax_rate    || 0),
    total_after_tax:   Number(body.total_after_tax || 0),
    item_count:        Number(body.item_count  || 0),
    order_date:        body.order_date         || nyDate,
    status:            body.status             || '下单',
    install_personnel: body.install_personnel  || '',
    install_date:      body.install_date       || '',
    install_address:   body.install_address    || '',
    install_remark:    body.install_remark     || '',
    operation_type:    body.operation_type     || '售货',
    order_items:       items,
    discount:          Number(body.discount    || 0),
    remark:            body.remark             || '',
    project_images:    Array.isArray(body.project_images) ? body.project_images : [],
  };

  const created = await base44.asServiceRole.entities.Order.create(orderData);

  // 4. 收款联动
  const paidAmount = Number(body.amount_paid || body.deposit || 0);
  if (paidAmount > 0) {
    const paymentRecord = await base44.asServiceRole.entities.PaymentRecord.create({
      order_id:       created.id,
      order_number:   orderNumber,
      type:           '收款',
      amount:         paidAmount,
      payment_method: orderData.payment_method,
      detail:         orderData.order_type,
      payment_date:   orderData.order_date,
      description:    `${body.client_name} - ${orderData.payment_method} (webhook)`,
      is_office:      orderData.is_office,
    });

    await base44.asServiceRole.entities.CashFlow.create({
      flow_type:   '转入',
      amount:      paidAmount,
      flow_date:   orderData.order_date,
      source_type: '订单收入',
      source_id:   paymentRecord.id,
      remark:      `订单 #${orderNumber} - ${body.client_name}`,
    });
  }

  return Response.json({
    success: true,
    order_id: created.id,
    order_number: created.order_number,
    client_id: clientId,
  }, { status: 201 });
});
