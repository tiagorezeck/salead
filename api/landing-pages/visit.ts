import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://zhyihwtgsctlpzspgsop.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoeWlod3Rnc2N0bHB6c3Bnc29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODE1OTksImV4cCI6MjA5OTU1NzU5OX0.Eg8KGBN8HmyQ0vnpZLhhjrFBrvW0YnIqzKLwiKL6_Gk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const body = req.body || {};
  const query = req.query || {};
  const targetId = body.lpId || body.id || query.id || body.slug || query.slug;
  const targetTitle = body.title || body.pageTitle || query.title;

  if (!targetId && !targetTitle) {
    return res.status(200).json({ status: "ok", visits: 1 });
  }

  let updatedVisits = 1;
  let updatedConv = 0;

  // 1. Atualização no Supabase se existir
  try {
    let queryBuilder = supabase.from("landing_pages").select("id, views_count, leads_count, config");
    if (isUUID(String(targetId))) {
      queryBuilder = queryBuilder.eq("id", targetId);
    } else if (targetId) {
      queryBuilder = queryBuilder.or(`id.eq.${targetId},slug.eq.${targetId}`);
    }

    const { data: lpList } = await queryBuilder.limit(1);
    if (lpList && lpList.length > 0) {
      const lp = lpList[0];
      const curVisits = Number(lp.views_count || 0) + 1;
      const curLeads = Number(lp.leads_count || 0);
      updatedVisits = curVisits;
      updatedConv = curVisits > 0 ? Math.round((curLeads / curVisits) * 100) : 0;

      await supabase
        .from("landing_pages")
        .update({
          views_count: curVisits,
          updated_at: new Date().toISOString()
        })
        .eq("id", lp.id);
    }
  } catch (err) {
    console.warn("Aviso ao atualizar visitas no Supabase:", err);
  }

  // 2. Encaminha para Google Apps Script se configurado
  const gasUrl = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;
  if (gasUrl) {
    try {
      await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_LP_VISIT",
          lpId: targetId,
          slug: body.slug,
          title: targetTitle
        })
      });
    } catch {}
  }

  return res.status(200).json({
    status: "success",
    visits: updatedVisits,
    conv: updatedConv,
    message: "Visita registrada com sucesso"
  });
}
