import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const secret = Deno.env.get("ORDER_WEBHOOK_SECRET");
  const authHeader = req.headers.get("Authorization") || "";
  const provided = authHeader.replace("Bearer ", "").trim();
  if (!secret || provided !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const base44 = createClientFromRequest(req);
  const memos = await base44.asServiceRole.entities.AIInternalMemo.list("-timestamp", limit);

  return Response.json({ success: true, memos });
});