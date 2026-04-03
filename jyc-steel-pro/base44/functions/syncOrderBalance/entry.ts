import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * 后端触发器：维护 Order 金额一致性
 *
 * 场景 A：PaymentRecord 新增/更新/删除 → 刷新关联 Order.amount_paid
 * 场景 B：Order 金额字段变更 → 强制重算 balance = total_price - amount_paid
 *
 * 由 entity automation 触发，payload 格式：
 * { trigger: "payment_change" | "order_amount_change", order_id: "...", entity_id: "..." }
 */

Deno.serve(async (req) => {
  const body = await req.json();
  const { trigger, order_id, entity_id, event } = body;

  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // ── 场景 A：PaymentRecord 变动 → 重算 amount_paid ─────────
  if (trigger === 'payment_change' || event?.entity_name === 'PaymentRecord') {
    const targetOrderId = order_id || body?.data?.order_id;
    if (!targetOrderId) {
      return Response.json({ skipped: true, reason: 'no order_id in payment record' });
    }
    const payments = await db.PaymentRecord.filter({ order_id: targetOrderId });
    const totalReceived = payments
      .filter(p => p.type === '收款')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalRefunded = payments
      .filter(p => p.type === '退款')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const amountPaid = totalReceived - totalRefunded;

    const order = await db.Order.filter({ id: targetOrderId });
    if (order.length === 0) return Response.json({ skipped: true, reason: 'order not found' });
    const totalPrice = Number(order[0].total_price || 0);
    const balance = totalPrice - amountPaid;

    await db.Order.update(targetOrderId, { amount_paid: amountPaid, balance });
    return Response.json({ success: true, action: 'payment_sync', order_id: targetOrderId, amount_paid: amountPaid, balance });
  }

  // ── 场景 B：Order 金额字段变动 → 强制重算 balance ──────────
  if (trigger === 'order_amount_change' || event?.entity_name === 'Order') {
    const targetOrderId = order_id || entity_id || body?.event?.entity_id;
    if (!targetOrderId) return Response.json({ skipped: true, reason: 'no order_id' });

    const orders = await db.Order.filter({ id: targetOrderId });
    if (orders.length === 0) return Response.json({ skipped: true, reason: 'order not found' });
    const o = orders[0];

    const totalPrice = Number(o.total_price || 0);
    const amountPaid = Number(o.amount_paid || 0);
    const correctBalance = totalPrice - amountPaid;

    if (Math.abs(correctBalance - Number(o.balance || 0)) > 0.001) {
      await db.Order.update(targetOrderId, { balance: correctBalance });
    }
    return Response.json({ success: true, action: 'balance_sync', order_id: targetOrderId, balance: correctBalance });
  }

  return Response.json({ skipped: true, reason: 'unrecognized trigger' });
});