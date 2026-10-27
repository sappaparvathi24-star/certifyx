import { J, cors, serviceDb, who } from '../_shared/http.js';
import { googleToken, realGoogle } from '../_shared/google.js';
import { syncCore, systemCheck } from '../_shared/core.js';
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS')
        return new Response('ok', { headers: cors });
    try {
        const db = serviceDb();
        let actor = 'cron';
        const cron = req.headers.get('x-cron-secret');
        if (!(cron && cron === Deno.env.get('CRON_SECRET'))) {
            const p = await who(req, db);
            if (p instanceof Response)
                return p;
            if (p.role !== 'faculty')
                return J({ error: 'Faculty only' }, 403);
            actor = p.email;
        }
        const body = await req.json().catch(() => ({}));
        const { data: cfg } = await db.from('settings').select('*').eq('id', 1).single();
        if (body.check) {
            let g = null, auth = { ok: true, detail: 'Token obtained' };
            try {
                g = realGoogle(await googleToken(db));
            }
            catch (e) {
                auth = { ok: false, detail: e.message };
            }
            return J({ checks: await systemCheck(db, g, cfg, auth) });
        }
        return J(await syncCore(db, realGoogle(await googleToken(db)), cfg, actor));
    }
    catch (e) {
        return J({ error: String(e.message || e) }, 500);
    }
});
