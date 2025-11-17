import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "Missing TELXIO credentials. Configure TELXIO_AUTHORIZATION or TELXIO_PUBLIC_KEY/TELXIO_PRIVATE_KEY." }, { status: 500 });
  }

  const account_id = process.env.TELXIO_ACCOUNT_ID || accountId;

  const url = `${baseUrl}/get_extensions/${encodeURIComponent(accountId)}/${encodeURIComponent(planId)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ account_id, public_key, private_key }),
    });

    const text = await res.text();
    const data = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();
    if (!res.ok) {
      return NextResponse.json({ error: "Telxio get_extensions failed", status: res.status, data }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
