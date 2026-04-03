import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { toCreate, toUpdate } = await req.json();

    // Bulk create (single API call, no rate limit issue)
    if (toCreate && toCreate.length > 0) {
      await base44.asServiceRole.entities.Material.bulkCreate(toCreate);
    }

    // Updates: sequential with retry on rate limit
    if (toUpdate && toUpdate.length > 0) {
      for (const u of toUpdate) {
        let retries = 5;
        while (retries > 0) {
          try {
            await base44.asServiceRole.entities.Material.update(u.id, u.data);
            break;
          } catch (err) {
            if (err.message && err.message.includes('Rate limit') && retries > 1) {
              retries--;
              await sleep(3000); // wait 3s before retry
            } else {
              throw err;
            }
          }
        }
        // Delay between each update to stay under rate limit
        await sleep(300);
      }
    }

    return Response.json({ ok: true, created: (toCreate || []).length, updated: (toUpdate || []).length });
  } catch (error) {
    console.error('[processImportChunk] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});