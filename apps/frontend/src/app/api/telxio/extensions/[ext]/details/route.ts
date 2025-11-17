import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, ctx: { params: Promise<{ ext: string }> }) {
  if ((process.env.TELXIO_BYPASS || "").toLowerCase() === "true") {
    const { ext } = await ctx.params;
    const numbers = (process.env.TELXIO_NUMBERS_FALLBACK || "13236595567,13236931150,16822431118,442046000568,442080683948").split(",").map(s=>s.trim()).filter(Boolean);
    return NextResponse.json({ data: { extension: { extension: ext, callerid: "" }, callerids: numbers } });
  }
  const { accountId, planId } = await req.json().catch(() => ({}));
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

  if (!authHeader || !public_key || !private_key) {
    const { ext } = await ctx.params;
    const numbers = (process.env.TELXIO_NUMBERS_FALLBACK || "13236595567,13236931150,16822431118,442046000568,442080683948").split(",").map(s=>s.trim()).filter(Boolean);
    return NextResponse.json({
      data: { extension: { extension: ext, callerid: "" }, callerids: numbers },
      meta: { softBypass: true, reason: "Missing TELXIO credentials" }
    });
  }

  const { ext } = await ctx.params;
  const url = `${baseUrl}/get_extension_details/${encodeURIComponent(accountId)}/${encodeURIComponent(planId)}/${encodeURIComponent(ext)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ account_id: accountId, public_key, private_key }),
    });
    const text = await res.text();
    const data = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();
    if (!res.ok) {
      const numbers = (process.env.TELXIO_NUMBERS_FALLBACK || "13236595567,13236931150,16822431118,442046000568,442080683948").split(",").map(s=>s.trim()).filter(Boolean);
      return NextResponse.json({
        data: { extension: { extension: ext, callerid: "" }, callerids: numbers },
        meta: { softBypass: true, status: res.status, upstream: data }
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    const numbers = (process.env.TELXIO_NUMBERS_FALLBACK || "13236595567,13236931150,16822431118,442046000568,442080683948").split(",").map(s=>s.trim()).filter(Boolean);
    return NextResponse.json({
      data: { extension: { extension: ext, callerid: "" }, callerids: numbers },
      meta: { softBypass: true, error: err?.message || "Unknown error" }
    });
  }
}
