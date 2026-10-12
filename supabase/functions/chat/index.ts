import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { convertToModelMessages, safeValidateUIMessages, streamText, type UIMessage } from "npm:ai";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
} from "./run-id.ts";

const allowedRoles = new Set(["mr", "asm", "admin"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const textFromMessage = (message: UIMessage) =>
  message.parts
    .filter((part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST requests are supported." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const gatewayKey = Deno.env.get("LOVABLE_API_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !gatewayKey) {
    return json({ error: "The assistant is not configured yet." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in to use the assistant." }, 401);

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Your session has expired. Please sign in again." }, 401);

  const { data: roleRow, error: roleError } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (roleError || !roleRow || !allowedRoles.has(roleRow.role)) {
    return json({ error: "You do not have access to the assistant." }, 403);
  }

  let payload: { messages?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "The assistant request was not valid." }, 400);
  }

  const validated = await safeValidateUIMessages({ messages: payload.messages });
  if (!validated.success) return json({ error: "The conversation could not be read." }, 400);
  const messages = validated.data;
  const latestQuestion = textFromMessage(messages.at(-1) ?? ({ parts: [] } as UIMessage));
  if (!latestQuestion) return json({ error: "Please enter a question." }, 400);
  if (latestQuestion.length > 2000) return json({ error: "Please keep questions under 2,000 characters." }, 400);

  const [doctorsResult, ordersResult, productsResult, targetsResult, notesResult] = await Promise.all([
    userClient.from("doctors").select("id,name,specialty,area,assigned_mr_id,last_visit_date,monthly_target,relationship_score,tags").eq("assigned_mr_id", user.id).limit(500),
    userClient.from("orders").select("id,order_date,total_amount,quantity,unit_price,scheme,doctor_id,pharmacy_id,product_id").eq("mr_id", user.id).order("order_date", { ascending: false }).limit(500),
    userClient.from("products").select("id,name,category,price,stock,product_type").limit(500),
    userClient.from("targets").select("doctor_id,target_type,target_month,target_value,achieved_value").eq("mr_id", user.id).order("target_month", { ascending: false }).limit(500),
    userClient.from("doctor_visit_notes").select("doctor_id,visit_date,notes,tags").eq("mr_id", user.id).order("visit_date", { ascending: false }).limit(500),
  ]);

  const records = {
    doctors: doctorsResult.data ?? [],
    orders: ordersResult.data ?? [],
    products: productsResult.data ?? [],
    targets: targetsResult.data ?? [],
    visitNotes: notesResult.data ?? [],
  };
  const queryError = [doctorsResult, ordersResult, productsResult, targetsResult, notesResult].find((result) => result.error)?.error;
  if (queryError) return json({ error: "Some of your field data could not be loaded. Please try again." }, 500);

  const instructions = `You are Winvision's field-sales assistant for a medical representative. Answer only from the supplied records and general sales-workflow reasoning. Be concise, practical, and transparent when data is missing. You may discuss the user's doctors, orders, products, visit notes, and targets. Never reveal phone numbers, passwords, access tokens, private credentials, or profit/margin information. Do not invent sales, targets, dates, or medical claims. If a question needs admin-only information, say that only an administrator can view it. Use INR (₹) for amounts.\n\nAuthenticated MR ID: ${user.id}\n\nAccessible records (JSON):\n${JSON.stringify(records)}`;

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: gatewayKey,
    headers: { "Lovable-API-Key": gatewayKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: instructions,
      messages: await convertToModelMessages(messages),
      abortSignal: req.signal,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const response = result.toUIMessageStreamResponse({ originalMessages: messages, sendReasoning: true });
    const headers = getLovableAiGatewayResponseHeaders(response.headers, corsHeaders);
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return new Response(null, { status: 499 });
    console.error("chat assistant error", error);
    return json({ error: "The assistant could not answer right now. Please try again." }, 500);
  }
});