import { NextResponse } from "next/server";

const headers = new Headers({
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
});

export async function GET() {

  const public_key = process.env.TELXIO_PUBLIC_KEY;
  const private_key = process.env.TELXIO_PRIVATE_KEY;
  const authorization = process.env.TELXIO_AUTHORIZATION; // e.g., "Basic base64..." or Bearer
  const cookie = process.env.TELXIO_COOKIE; // optional

  if (!public_key || !private_key) {
    const missing = [
      !public_key ? "TELXIO_PUBLIC_KEY" : null,
      !private_key ? "TELXIO_PRIVATE_KEY" : null,
    ].filter(Boolean);
    return NextResponse.json({ error: "Missing TELXIO env vars", missing }, { status: 500, headers });
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

        // Log detailed error information for debugging
        if (!resGet.ok || !okShape) {
          console.error('Telxio GET attempt failed:', {
            account: acct,
            status: resGet.status,
            statusText: resGet.statusText,
            response: textGet,
            parsed: parsedGet,
            okShape
          });
        }

        if (resGet.ok && okShape) {
          return NextResponse.json(parsedGet, { headers });
        }
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
          return NextResponse.json(parsedPost, { headers });
        }
        attempts.push({ id: acct, method: "POST", status: resPost.status, body: parsedPost ?? textPost });
      } catch (e: any) {
        attempts.push({ id: acct, method: "POST", error: e?.message || String(e) });
      }
    }

    return NextResponse.json({ error: "Telxio account fetch failed", attempts }, { status: 502, headers });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500, headers });
  }
}

export async function POST() {

  const public_key = process.env.TELXIO_PUBLIC_KEY;
  const private_key = process.env.TELXIO_PRIVATE_KEY;
  const authorization = process.env.TELXIO_AUTHORIZATION;
  const cookie = process.env.TELXIO_COOKIE;

  let candidates: string[] = [];
  const attempts: any[] = [];

  if (!public_key || !private_key) {
    console.warn("Missing TELXIO env vars (TELXIO_PUBLIC_KEY/TELXIO_PRIVATE_KEY). Skipping API calls and using fallback data.");
  } else {
    const baseUrl = process.env.TELXIO_BASE_URL || "https://pbx2.telxio.com.sg/ApiV2";
    const url = `${baseUrl}/get_account_details`;

    try {
      candidates = (process.env.TELXIO_ACCOUNT_IDS || process.env.TELXIO_ACCOUNT_ID || "360")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      console.log("Telxio account fetch candidates:", candidates);
      console.log("Using base URL:", baseUrl);

      for (const acct of candidates) {
        // Try GET first with proper parameters
        try {
          const basicAuth = `Basic ${Buffer.from(`${public_key}:${private_key}`).toString('base64')}`;
          const getUrl = `${url}?account_id=${encodeURIComponent(acct)}&public_key=${encodeURIComponent(public_key)}&private_key=${encodeURIComponent(private_key)}`;
          const getRes = await fetch(getUrl, {
            method: "GET",
            headers: {
              Authorization: basicAuth,
              ...(cookie ? { Cookie: cookie } : {}),
            },
          });
          const textGet = await getRes.text();
          const parsedGet = (() => { try { return JSON.parse(textGet); } catch { return null; } })();

          if (getRes.ok && parsedGet && !parsedGet.error) {
            return NextResponse.json(parsedGet);
          }
          attempts.push({ id: acct, method: "GET", status: getRes.status, body: parsedGet ?? textGet });
        } catch (e: any) {
          attempts.push({ id: acct, method: "GET", error: e?.message || String(e) });
        }

        // Then POST with proper parameters
        try {
          const basicAuth = `Basic ${Buffer.from(`${public_key}:${private_key}`).toString('base64')}`;
          const postRes = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: basicAuth,
              ...(cookie ? { Cookie: cookie } : {}),
            },
            body: JSON.stringify({ account_id: acct, public_key, private_key }),
          });
          const textPost = await postRes.text();
          const parsedPost = (() => { try { return JSON.parse(textPost); } catch { return null; } })();

          if (postRes.ok && parsedPost && !parsedPost.error) {
            return NextResponse.json(parsedPost);
          }
          attempts.push({ id: acct, method: "POST", status: postRes.status, body: parsedPost ?? textPost });
        } catch (e: any) {
          attempts.push({ id: acct, method: "POST", error: e?.message || String(e) });
        }
      }
    } catch (err: any) {
      console.error("Telxio account fetch error:", err);
      attempts.push({ error: err?.message || String(err) });
    }
  }

  // Fallback if keys missing or all attempts failed
  console.error("Telxio account fetch failed. Attempts:", JSON.stringify(attempts, null, 2));
  console.log("Env vars check:", {
    hasPublic: !!public_key,
    hasPrivate: !!private_key,
    hasAuth: !!authorization,
    candidates: candidates
  });
  return NextResponse.json({
    error: "Telxio account fetch failed after all attempts",
    attempts,
    envCheck: { hasPublic: !!public_key, hasPrivate: !!private_key }
  }, { status: 502, headers });
}
