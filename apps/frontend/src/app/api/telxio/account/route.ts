import { NextResponse } from "next/server";

export async function GET() {
  if ((process.env.TELXIO_BYPASS || "").toLowerCase() === "true") {
    const accountId = process.env.TELXIO_ACCOUNT_FALLBACK || "360";
    const planId = process.env.TELXIO_PLAN_FALLBACK || "10332";
    const exts = (process.env.TELXIO_EXTENSIONS_FALLBACK || "1033201,1033202,1033203,1033204,1033205,1033206,1033207,1033208,1033209,1033210,1033211").split(",").map(s=>s.trim()).filter(Boolean);
    const numbers = (process.env.TELXIO_NUMBERS_FALLBACK || "13236595567,13236931150,16822431118,442046000568,442080683948").split(",").map(s=>s.trim()).filter(Boolean);
    return NextResponse.json({ action: "get_account_details", data: { account_id: accountId, crm_id: accountId, plan: { [planId]: { numbers, extensions: exts } } } });
  }
  const public_key = process.env.TELXIO_PUBLIC_KEY;
  const private_key = process.env.TELXIO_PRIVATE_KEY;
  const authorization = process.env.TELXIO_AUTHORIZATION; // e.g., "Basic base64..." or Bearer
  const cookie = process.env.TELXIO_COOKIE; // optional

  if (!public_key || !private_key) {
    const missing = [
      !public_key ? "TELXIO_PUBLIC_KEY" : null,
      !private_key ? "TELXIO_PRIVATE_KEY" : null,
    ].filter(Boolean);
    return NextResponse.json({ error: "Missing TELXIO env vars", missing }, { status: 500 });
  }

  const baseUrl = process.env.TELXIO_BASE_URL || "https://pbx2.telxio.com.sg/ApiV2";
  const url = `${baseUrl}/get_account_details`;

  try {
    const candidates = (process.env.TELXIO_ACCOUNT_IDS || process.env.TELXIO_ACCOUNT_ID || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const attempts: any[] = [];

    for (const acct of candidates) {
      // Try GET
      try {
        const getUrl = `${url}?account_id=${encodeURIComponent(acct)}&public_key=${encodeURIComponent(public_key)}&private_key=${encodeURIComponent(private_key)}`;
        const resGet = await fetch(getUrl, {
          method: "GET",
          headers: {
            ...(authorization ? { Authorization: authorization } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
          },
        });
        const textGet = await resGet.text();
        const parsedGet = (() => { try { return JSON.parse(textGet); } catch { return null; } })();
        const okShape = Boolean(parsedGet?.data?.plan && parsedGet?.data?.account_id);
        if (resGet.ok && okShape) {
          return NextResponse.json(parsedGet);
        }
        attempts.push({ id: acct, method: "GET", status: resGet.status, body: parsedGet ?? textGet });
      } catch (e: any) {
        attempts.push({ id: acct, method: "GET", error: e?.message || String(e) });
      }

      // Try POST
      try {
        const resPost = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authorization ? { Authorization: authorization } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
          },
          body: JSON.stringify({ account_id: acct, public_key, private_key }),
        });
        const textPost = await resPost.text();
        const parsedPost = (() => { try { return JSON.parse(textPost); } catch { return null; } })();
        const okShape = Boolean(parsedPost?.data?.plan && parsedPost?.data?.account_id);
        if (resPost.ok && okShape) {
          return NextResponse.json(parsedPost);
        }
        attempts.push({ id: acct, method: "POST", status: resPost.status, body: parsedPost ?? textPost });
      } catch (e: any) {
        attempts.push({ id: acct, method: "POST", error: e?.message || String(e) });
      }
    }

    return NextResponse.json({ error: "Telxio account fetch failed", attempts }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export async function POST() {
  if ((process.env.TELXIO_BYPASS || "").toLowerCase() === "true") {
    const accountId = process.env.TELXIO_ACCOUNT_FALLBACK || "360";
    const planId = process.env.TELXIO_PLAN_FALLBACK || "10332";
    const exts = (process.env.TELXIO_EXTENSIONS_FALLBACK || "1033201,1033202,1033203,1033204,1033205,1033206,1033207,1033208,1033209,1033210,1033211").split(",").map(s=>s.trim()).filter(Boolean);
    const numbers = (process.env.TELXIO_NUMBERS_FALLBACK || "13236595567,13236931150,16822431118,442046000568,442080683948").split(",").map(s=>s.trim()).filter(Boolean);
    return NextResponse.json({ action: "get_account_details", data: { account_id: accountId, crm_id: accountId, plan: { [planId]: { numbers, extensions: exts } } } });
  }
  const public_key = process.env.TELXIO_PUBLIC_KEY;
  const private_key = process.env.TELXIO_PRIVATE_KEY;
  const authorization = process.env.TELXIO_AUTHORIZATION;
  const cookie = process.env.TELXIO_COOKIE;

  if (!public_key || !private_key) {
    const missing = [
      !public_key ? "TELXIO_PUBLIC_KEY" : null,
      !private_key ? "TELXIO_PRIVATE_KEY" : null,
    ].filter(Boolean);
    return NextResponse.json({ error: "Missing TELXIO env vars", missing }, { status: 500 });
  }

  const baseUrl = process.env.TELXIO_BASE_URL || "https://pbx2.telxio.com.sg/ApiV2";
  const url = `${baseUrl}/get_account_details`;

  try {
    const candidates = (process.env.TELXIO_ACCOUNT_IDS || process.env.TELXIO_ACCOUNT_ID || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const attempts: any[] = [];

    for (const acct of candidates) {
      // Try GET first
      try {
        const getUrl = `${url}?account_id=${encodeURIComponent(acct)}&public_key=${encodeURIComponent(public_key)}&private_key=${encodeURIComponent(private_key)}`;
        const resGet = await fetch(getUrl, {
          method: "GET",
          headers: {
            ...(authorization ? { Authorization: authorization } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
          },
        });
        const textGet = await resGet.text();
        const parsedGet = (() => { try { return JSON.parse(textGet); } catch { return null; } })();
        if (resGet.ok && parsedGet) {
          return NextResponse.json(parsedGet);
        }
        attempts.push({ id: acct, method: "GET", status: resGet.status, body: parsedGet ?? textGet });
      } catch (e: any) {
        attempts.push({ id: acct, method: "GET", error: e?.message || String(e) });
      }

      // Then POST
      try {
        const resPost = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authorization ? { Authorization: authorization } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
          },
          body: JSON.stringify({ account_id: acct, public_key, private_key }),
        });
        const textPost = await resPost.text();
        const parsedPost = (() => { try { return JSON.parse(textPost); } catch { return null; } })();
        if (resPost.ok && parsedPost) {
          return NextResponse.json(parsedPost);
        }
        attempts.push({ id: acct, method: "POST", status: resPost.status, body: parsedPost ?? textPost });
      } catch (e: any) {
        attempts.push({ id: acct, method: "POST", error: e?.message || String(e) });
      }
    }

    return NextResponse.json({ error: "Telxio account fetch failed", attempts }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
