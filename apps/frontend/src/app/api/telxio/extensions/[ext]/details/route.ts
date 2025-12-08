import { NextRequest, NextResponse } from "next/server";

const headers = new Headers({
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ ext: string }> }) {
  if ((process.env.TELXIO_BYPASS || "").toLowerCase() === "true") {
    const { ext } = await ctx.params;
    const numbers = (process.env.TELXIO_NUMBERS_FALLBACK || "442046000568,441214681682,442046382898,12148330889,16073206094").split(",").map(s=>s.trim()).filter(Boolean);
    return NextResponse.json({ data: { extension: { extension: ext, callerid: "" }, callerids: numbers }, headers });
  }
  const { accountId, planId } = await req.json().catch(() => ({}));
  if (!accountId || !planId) {
    return NextResponse.json({ error: "Missing accountId or planId" }, { status: 400, headers });
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
    const numbers = (process.env.TELXIO_NUMBERS_FALLBACK || "442046000568,441214681682,442046382898,12148330889,16073206094").split(",").map(s=>s.trim()).filter(Boolean);
    return NextResponse.json({
      data: { extension: { extension: ext, callerid: "" }, callerids: numbers },
      meta: { softBypass: true, reason: "Missing TELXIO credentials - using fallback DIDs only" }
    }, { headers });
  }

  const { ext } = await ctx.params;
  const url = `${baseUrl}/get_extension_details/${encodeURIComponent(accountId)}/${encodeURIComponent(planId)}/${encodeURIComponent(ext)}`;

  let res: Response | undefined;
  let data: any;
  let postRes: Response | undefined;
  let postData: any;

  try {
    // Use GET method as per the curl example for get_extension_details
    try {
      const getUrl = `${baseUrl}/get_extension_details/${encodeURIComponent(accountId)}/${encodeURIComponent(planId)}/${encodeURIComponent(ext)}`;
      res = await fetch(getUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          ...(cookie ? { Cookie: cookie } : {}),
        },
      });
      const text = await res.text();
      data = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();
      
      console.log(`Telxio extension ${ext} GET response:`, {
        status: res.status,
        ok: res.ok,
        data: data,
        extensionData: data?.data?.extension,
        callerIds: data?.data?.callerids,
        callerid: data?.data?.extension?.callerid
      });
      
      if (res.ok && data?.data?.extension) {
        console.log(`Telxio extension ${ext} GET success:`, data);
        return NextResponse.json(data, { headers });
      }
      
      // If GET fails, try POST as fallback
      console.log(`GET failed for extension ${ext}, trying POST method...`);
      postRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({ account_id: accountId, public_key, private_key }),
      });
      const postText = await postRes.text();
      postData = (() => { try { return JSON.parse(postText); } catch { return { raw: postText }; } })();
      
      console.log(`Telxio extension ${ext} POST response:`, {
        status: postRes.status,
        ok: postRes.ok,
        data: postData
      });
      
      if (postRes.ok && postData?.data?.extension) {
        console.log(`Telxio extension ${ext} POST success:`, postData);
        return NextResponse.json(postData, { headers });
      }
      
      // Log the final failure and return fallback
      console.error(`Telxio extension ${ext} - Both methods failed. Last response:`, {
        getResponse: { status: res.status, ok: res.ok, data: data },
        postResponse: { status: postRes.status, ok: postRes.ok, data: postData },
        authHeader: authHeader ? 'Present' : 'Missing',
        accountId,
        planId: planId
      });
    
    } catch (innerErr: any) {
      console.error(`Telxio extension ${ext} - Inner try-catch error:`, innerErr);
    }
    
    const numbers = (process.env.TELXIO_NUMBERS_FALLBACK || "442046000568,441214681682,442046382898,12148330889,16073206094").split(",").map(s=>s.trim()).filter(Boolean);
    return NextResponse.json({
      data: { extension: { extension: ext, callerid: "" }, callerids: numbers },
      meta: { softBypass: true, status: res?.status, upstream: data, reason: "Both GET and POST methods failed" }
    }, { headers });
  } catch (err: any) {
    const numbers = (process.env.TELXIO_NUMBERS_FALLBACK || "442046000568,441214681682,442046382898,12148330889,16073206094").split(",").map(s=>s.trim()).filter(Boolean);
    return NextResponse.json({
      data: { extension: { extension: ext, callerid: "" }, callerids: numbers },
      meta: { softBypass: true, error: err?.message || "Unknown error" }
    });
  }
}
