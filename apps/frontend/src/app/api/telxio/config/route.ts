import { NextResponse } from "next/server";

export async function GET() {
  const extensions = (process.env.TELXIO_EXTENSIONS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const cfg = {
    hasAuth: Boolean(process.env.TELXIO_AUTHORIZATION),
    hasKeys: Boolean(process.env.TELXIO_ACCOUNT_ID && process.env.TELXIO_PUBLIC_KEY && process.env.TELXIO_PRIVATE_KEY),
    switchId: process.env.TELXIO_SWITCH_ID || null,
    accountPathId: process.env.TELXIO_ACCOUNT_PATH_ID || null,
    extensions,
  };
  return NextResponse.json(cfg);
}
