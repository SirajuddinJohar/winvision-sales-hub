import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
  const created: any[] = [];

  const upsert = async (rows: any[]) => {
    for (const r of rows) {
      // dedupe by (source, entity_id, remind_date, user_id)
      const { data: existing } = await supa.from('reminders').select('id')
        .eq('source', r.source).eq('user_id', r.user_id).eq('remind_date', r.remind_date)
        .eq('entity_id', r.entity_id).maybeSingle();
      if (existing) continue;
      const { data, error } = await supa.from('reminders').insert({ ...r, is_auto: true, created_by: r.user_id }).select().single();
      if (!error && data) {
        created.push(data);
        // also create in-app notification when it's for today
        if (r.remind_date === todayStr) {
          await supa.from('notifications').insert({
            user_id: r.user_id, title: r.title, message: r.note || r.title,
            type: 'info', link: r.link,
          });
        }
      }
    }
  };

  try {
    // 1. Birthdays & anniversaries (next 7 days) - sent to all admins
    const { data: doctors } = await supa.from('doctors').select('id,name,birthday,anniversary');
    const { data: admins } = await supa.from('user_roles').select('user_id').eq('role', 'admin');
    const adminIds = (admins || []).map(a => a.user_id);

    const upcomingDates: any[] = [];
    for (const d of doctors || []) {
      for (const kind of ['birthday', 'anniversary'] as const) {
        const v = (d as any)[kind];
        if (!v) continue;
        const dt = new Date(v); dt.setFullYear(today.getFullYear());
        if (dt < today) dt.setFullYear(today.getFullYear() + 1);
        if (dt <= in7) {
          for (const uid of adminIds) {
            upcomingDates.push({
              user_id: uid, source: kind, title: `${kind === 'birthday' ? '🎂 Birthday' : '💝 Anniversary'}: Dr. ${d.name}`,
              note: null, remind_date: dt.toISOString().slice(0,10), remind_time: '09:00',
              entity_type: 'doctor', entity_id: d.id, link: `/dashboard/doctors/${d.id}`,
            });
          }
        }
      }
    }
    await upsert(upcomingDates);

    // 2. Tour plan today
    const { data: tpDays } = await supa.from('tour_plan_days').select('id,visit_date,tour_plan_id,area_id, areas(name), tour_plans(mr_id,status)').eq('visit_date', todayStr);
    const tpRows: any[] = [];
    for (const d of tpDays || []) {
      const tp: any = (d as any).tour_plans;
      if (tp?.status !== 'approved') continue;
      const areaName = (d as any).areas?.name || 'area';
      tpRows.push({
        user_id: tp.mr_id, source: 'tour_plan', title: `Today's plan: ${areaName}`,
        note: null, remind_date: todayStr, remind_time: '07:30',
        entity_type: 'none', entity_id: null, link: '/dashboard/daily-working',
      });
    }
    await upsert(tpRows);

    // 3. Payment follow-ups: orders unpaid > 15 days
    const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 15);
    const { data: unpaid } = await supa.from('orders').select('id,order_date,mr_id,total_amount,payment_status,doctor_id,pharmacy_id')
      .eq('payment_status', 'pending').lte('order_date', cutoff.toISOString().slice(0,10));
    const payRows: any[] = [];
    for (const o of unpaid || []) {
      if (!o.mr_id) continue;
      payRows.push({
        user_id: o.mr_id, source: 'payment', title: `Payment pending: ₹${o.total_amount}`,
        note: `Order from ${o.order_date} still unpaid`, remind_date: todayStr, remind_time: '10:00',
        entity_type: 'order', entity_id: o.id, link: '/dashboard/orders',
      });
    }
    await upsert(payRows);

    return new Response(JSON.stringify({ created: created.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
