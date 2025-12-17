
export const GSM_CONFIG = {
    extension: process.env.NEXT_PUBLIC_GSM_EXTENSION || "600",
    password: process.env.NEXT_PUBLIC_GSM_PASSWORD || "",
    domain: process.env.NEXT_PUBLIC_GSM_DOMAIN || "192.168.0.238",
    wssUrl: process.env.NEXT_PUBLIC_GSM_WSS_URL || "wss://192.168.0.238:8089/ws",
    stunServer: process.env.NEXT_PUBLIC_GSM_STUN_SERVER || "stun:stun.l.google.com:19302",
    realm: process.env.NEXT_PUBLIC_GSM_REALM || "asterisk" // Common PJSIP default realm
}
