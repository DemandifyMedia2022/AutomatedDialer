import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const { accountId, planId, items } = body as { accountId?: string; planId?: string; items?: Array<{ ext: string; data: any }>; };

  if (!accountId || !planId || !Array.isArray(items)) {
    return NextResponse.json({ error: "Missing accountId, planId or items" }, { status: 400 });
  }

  if ((process.env.TELXIO_BYPASS || "").toLowerCase() === "true") {
    const results: Record<string, any> = {};
    for (const it of items) {
      results[it.ext] = { ok: true, bypass: true, callerid: it.data?.callerid ?? null, updated: { applied: it.data } };
    }
    return NextResponse.json({ ok: true, results });
  }

  const account_id = process.env.TELXIO_ACCOUNT_ID;
  const public_key = process.env.TELXIO_PUBLIC_KEY;
  const private_key = process.env.TELXIO_PRIVATE_KEY;
  const authorization = process.env.TELXIO_AUTHORIZATION;
  const cookie = process.env.TELXIO_COOKIE;
  const baseUrl = process.env.TELXIO_BASE_URL || "https://pbx2.telxio.com.sg/ApiV2";

  if (!account_id || !public_key || !private_key) {
    const results: Record<string, any> = {};
    for (const it of items) {
      results[it.ext] = { ok: true, softBypass: true, reason: "Missing TELXIO env vars", callerid: it.data?.callerid ?? null };
    }
    return NextResponse.json({ ok: true, results });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authorization ? { Authorization: authorization } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
  };

  const results: Record<string, any> = {};

  await Promise.all(items.map(async (it) => {
    const ext = it.ext;
    const updateUrl = `${baseUrl}/set_extension_details/${encodeURIComponent(accountId)}/${encodeURIComponent(planId)}/${encodeURIComponent(ext)}`;
    try {
      const updateRes = await fetch(updateUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "update_extension",
          extension: ext,
          data: it.data || {},
        }),
      });
      const updateText = await updateRes.text();
      const updated = (() => { try { return JSON.parse(updateText); } catch { return { raw: updateText }; } })();

      // Verify regardless of update OK to reflect actual PBX state (with small retries)
      const verifyUrl = `${baseUrl}/get_extension_details/${encodeURIComponent(accountId)}/${encodeURIComponent(planId)}/${encodeURIComponent(ext)}`;
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      let verify: any = null;
      let callerid: string | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await sleep(300 * attempt);
          const verifyRes = await fetch(verifyUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ account_id, public_key, private_key }),
          });
          const verifyText = await verifyRes.text();
          verify = (() => { try { return JSON.parse(verifyText); } catch { return { raw: verifyText }; } })();
          callerid = verify?.data?.extension?.callerid ?? null;
          if (callerid != null) break;
        } catch {}
      }

      results[ext] = { ok: true, status: updateRes.status, updated, verify, callerid };
    } catch (e: any) {
      results[ext] = { ok: false, error: e?.message || String(e) };
    }
  }));

  return NextResponse.json({ ok: true, results });
}
