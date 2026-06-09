// Send push notifications (FCM HTTP v1 + web fallback) to all device tokens for a user.
// Triggered by AFTER INSERT trigger on public.reminders.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  reminder_id: string;
  user_id: string;
  title: string;
  body: string;
  link?: string | null;
  remind_date: string;
  remind_time: string;
}

// FCM HTTP v1 — requires FCM_SERVICE_ACCOUNT_JSON secret (Firebase service account)
// and FCM_PROJECT_ID secret.
async function getFcmAccessToken(saJson: string): Promise<string> {
  const sa = JSON.parse(saJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const toSign = `${enc(header)}.${enc(claim)}`;

  const pem = sa.private_key.replace(/\\n/g, "\n");
  const pkcs8 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const bin = Uint8Array.from(atob(pkcs8), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    bin,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(toSign),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const jwt = `${toSign}.${sigB64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`FCM token err: ${JSON.stringify(json)}`);
  return json.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokens, error } = await supabase
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", payload.user_id);
    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const saJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    const projectId = Deno.env.get("FCM_PROJECT_ID");
    let sent = 0;
    const errors: string[] = [];

    if (saJson && projectId) {
      const accessToken = await getFcmAccessToken(saJson);
      for (const t of tokens) {
        const msg = {
          message: {
            token: t.token,
            notification: { title: payload.title, body: payload.body || "Reminder" },
            data: {
              reminder_id: payload.reminder_id,
              link: payload.link ?? "",
            },
          },
        };
        const r = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(msg),
          },
        );
        if (r.ok) sent++;
        else {
          const errText = await r.text();
          errors.push(errText);
          // Remove invalid tokens
          if (r.status === 404 || r.status === 400) {
            await supabase.from("device_tokens").delete().eq("token", t.token);
          }
        }
      }
    } else {
      errors.push("FCM_SERVICE_ACCOUNT_JSON / FCM_PROJECT_ID not configured");
    }

    return new Response(JSON.stringify({ sent, total: tokens.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-reminder-push error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
