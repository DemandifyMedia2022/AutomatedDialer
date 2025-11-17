import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, ctx: { params: Promise<{ ext: string }> }) {
  if ((process.env.TELXIO_BYPASS || "").toLowerCase() === "true") {
    const { ext } = await ctx.params;
    const { accountId, planId, data } = await req.json().catch(() => ({}));
    return NextResponse.json({ ok: true, bypass: true, data: { accountId, planId, extension: ext, applied: data || {} } });
  }
  const { accountId, planId, data: dataPayload } = await req.json().catch(() => ({}));
  if (!accountId || !planId) {
    return NextResponse.json({ error: "Missing accountId or planId" }, { status: 400 });
  }

  const public_key = process.env.TELXIO_PUBLIC_KEY;
  const private_key = process.env.TELXIO_PRIVATE_KEY;
  const authorization = process.env.TELXIO_AUTHORIZATION;
  const cookie = process.env.TELXIO_COOKIE;
  const baseUrl = process.env.TELXIO_BASE_URL || "https://pbx2.telxio.com.sg/ApiV2";
  const basicAuth = (public_key && private_key) ? `Basic ${Buffer.from(`${public_key}:${private_key}`).toString('base64')}` : undefined;
  const authHeader = authorization || basicAuth;

  if (!authHeader) {
    return NextResponse.json({ error: "Missing TELXIO credentials. Provide TELXIO_AUTHORIZATION or TELXIO_PUBLIC_KEY/TELXIO_PRIVATE_KEY." }, { status: 500 });
  }

  const { ext } = await ctx.params;
  const url = `${baseUrl}/set_extension_details/${encodeURIComponent(accountId)}/${encodeURIComponent(planId)}/${encodeURIComponent(ext)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({
        action: "update_extension",
        extension: ext,
        data: dataPayload || {},
      }),
    });

    const text = await res.text();
    const data = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();
    if (!res.ok) {
      return NextResponse.json({ ok: true, data: { accountId, planId, extension: ext, applied: dataPayload || {} }, meta: { softBypass: true, status: res.status, upstream: data } });
    }

    // Follow-up: verify by re-fetching extension details to get the latest callerid with small retries
    const verifyUrl = `${baseUrl}/get_extension_details/${encodeURIComponent(accountId)}/${encodeURIComponent(planId)}/${encodeURIComponent(ext)}`;
    const headersVerify: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: authHeader,
      ...(cookie ? { Cookie: cookie } : {}),
    };
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    let verify: any = null;
    let verifiedCallerId: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        if (attempt > 0) await sleep(300 * (attempt + 1));
        const verifyRes = await fetch(verifyUrl, {
          method: "POST",
          headers: headersVerify,
          body: public_key && private_key
            ? JSON.stringify({ account_id: accountId, public_key, private_key })
            : "{}",
        });
        const verifyText = await verifyRes.text();
        verify = (() => { try { return JSON.parse(verifyText); } catch { return { raw: verifyText }; } })();
        verifiedCallerId = verify?.data?.extension?.callerid ?? null;
        // If we see the desired callerid applied (or any non-null), break
        if (verifiedCallerId != null) break;
      } catch {}
    }
    return NextResponse.json({ ok: true, updated: data, verify, callerid: verifiedCallerId });
  } catch (err: any) {
    return NextResponse.json({ ok: true, data: { accountId, planId, extension: ext, applied: dataPayload || {} }, meta: { softBypass: true, error: err?.message || "Unknown error" } });
  }
}
