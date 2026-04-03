import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const secret = Deno.env.get("ORDER_WEBHOOK_SECRET");
  const authHeader = req.headers.get("Authorization") || "";
  const provided = authHeader.replace("Bearer ", "").trim();
  if (!secret || provided !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { author, content } = body;

  if (!author || !content) {
    return Response.json({ error: "Missing required fields: author, content" }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);
  const memo = await base44.asServiceRole.entities.AIInternalMemo.create({
    author,
    content,
    timestamp: new Date().toISOString(),
  });

  return Response.json({ success: true, memo });
});