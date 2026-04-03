import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Agent 全权管理接口
 *
 * 支持两种调用方式：
 * A) Query-param 方式（HTTP method 决定操作）：
 *    GET    /?entity=Order&limit=100          → 全表读取
 *    DELETE /?entity=Order&id=xxx            → 删除单条
 *    DELETE /?entity=Order&deleteAll=true    → 清空整表
 *    PATCH  /?entity=Order&id=xxx  + body    → 更新单条
 *
 * B) POST + JSON body 方式（Agent 友好）：
 *    POST body: { action: "GET",        entity: "Order", limit: 100 }
 *    POST body: { action: "DELETE",     entity: "Order", id: "xxx" }
 *    POST body: { action: "DELETE_ALL", entity: "Order" }
 *    POST body: { action: "PATCH",      entity: "Order", id: "xxx", data: {...} }
 */

Deno.serve(async (req) => {
  const secret = Deno.env.get('ORDER_WEBHOOK_SECRET');
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const allowedEntities = ['Order', 'PaymentRecord', 'CashFlow', 'Expense', 'AIInternalMemo', 'Material', 'Supplier', 'PurchaseOrder', 'Employee', 'Attendance', 'Client'];

  // ── 解析参数（兼容 query-param 和 POST body）────────────────
  let method = req.method;
  let entity, id, deleteAll, limit, patchData, action;

  if (req.method === 'POST') {
    const body = await req.json();
    action    = (body.action || '').toUpperCase();
    entity    = body.entity;
    id        = body.id;
    deleteAll = action === 'DELETE_ALL';
    limit     = parseInt(body.limit || '200');
    patchData = body.data;
    // Map action → method for unified handling below
    if (action === 'GET')        method = 'GET';
    else if (action === 'DELETE' || action === 'DELETE_ALL') method = 'DELETE';
    else if (action === 'PATCH') method = 'PATCH';
    else {
      return Response.json({ error: `Unknown action: ${action}. Use GET, DELETE, DELETE_ALL, PATCH` }, { status: 400 });
    }
  } else {
    entity    = url.searchParams.get('entity');
    id        = url.searchParams.get('id');
    deleteAll = url.searchParams.get('deleteAll') === 'true';
    limit     = parseInt(url.searchParams.get('limit') || '200');
  }

  if (!entity || !allowedEntities.includes(entity)) {
    return Response.json({
      error: `entity is required and must be one of: ${allowedEntities.join(', ')}`
    }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities[entity];

  // ── GET — 全表读取 ──────────────────────────────────────────
  if (method === 'GET') {
    const records = await db.list('-created_date', limit);
    return Response.json({ success: true, entity, count: records.length, records });
  }

  // ── DELETE — 单条或清空 ─────────────────────────────────────
  if (method === 'DELETE') {
    if (deleteAll) {
      // 分批读取并删除（每批500条，避免超时）
      let deleted = 0;
      let batch;
      do {
        batch = await db.list('created_date', 500);
        for (const record of batch) {
          await db.delete(record.id);
          deleted++;
        }
      } while (batch.length === 500);

      // 注意：计数器（如订单号）由 orderWebhook 动态计算 max+1，
      // 清空后自动从 30001 开始，无需额外操作。
      return Response.json({
        success: true,
        action: 'DELETE_ALL',
        entity,
        deleted,
        note: entity === 'Order' ? 'Next order number will start from 30001 automatically.' : undefined
      });
    }

    if (!id) return Response.json({ error: 'id is required for single delete' }, { status: 400 });
    await db.delete(id);
    return Response.json({ success: true, action: 'DELETE', entity, deleted_id: id });
  }

  // ── PATCH — 更新单条 ────────────────────────────────────────
  if (method === 'PATCH') {
    if (!id) return Response.json({ error: 'id is required for patch' }, { status: 400 });
    // patchData from POST body, or JSON from non-POST body
    const updatePayload = patchData || (req.method !== 'POST' ? await req.json() : {});
    const updated = await db.update(id, updatePayload);
    return Response.json({ success: true, action: 'PATCH', entity, updated });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});