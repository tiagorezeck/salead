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
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const queryId = (req.query.token || req.query.pageId || req.query.id || req.query.slug) as string;

  if (req.method === "GET") {
    if (!queryId) {
      return res.status(400).json({ error: "Parâmetro id, token ou pageId obrigatório" });
    }

    try {
      // 1. Busca por UUID exato se for UUID
      if (isUUID(queryId)) {
        const { data, error } = await supabase.from("landing_pages").select("*").eq("id", queryId).maybeSingle();
        if (data && !error) {
          const mapped = {
            id: data.id,
            name: data.name,
            title: data.name,
            template: data.template,
            status: data.status,
            ...(typeof data.config === "object" ? data.config : {}),
          };
          return res.status(200).json({ page: mapped });
        }
      }

      // 2. Busca por slug, client_id ou name
      const { data: byQuery } = await supabase
        .from("landing_pages")
        .select("*")
        .or(`config->>slug.eq.${queryId},config->>client_id.eq.${queryId},name.eq.${queryId}`)
        .limit(1);

      if (byQuery && byQuery.length > 0) {
        const row = byQuery[0];
        const mapped = {
          id: row.id,
          name: row.name,
          title: row.name,
          template: row.template,
          status: row.status,
          ...(typeof row.config === "object" ? row.config : {}),
        };
        return res.status(200).json({ page: mapped });
      }

      // 3. Fallback: lista recente para correspondência flexível
      const { data: allLps } = await supabase.from("landing_pages").select("*").limit(30);
      if (allLps && allLps.length > 0) {
        const found = allLps.find(
          (p) =>
            p.id === queryId ||
            p.config?.slug === queryId ||
            p.config?.client_id === queryId ||
            p.name?.toLowerCase().includes(queryId.toLowerCase())
        );
        if (found) {
          const mapped = {
            id: found.id,
            name: found.name,
            title: found.name,
            template: found.template,
            status: found.status,
            ...(typeof found.config === "object" ? found.config : {}),
          };
          return res.status(200).json({ page: mapped });
        }
      }

      return res.status(404).json({ error: "Página de preview não encontrada" });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || "Erro interno ao buscar preview" });
    }
  }

  if (req.method === "POST") {
    try {
      // Aceita tanto { page: ... } quanto o objeto page diretamente no body
      const page = req.body?.page || (req.body?.id ? req.body : null);
      if (!page) {
        return res.status(400).json({ error: "Objeto page é obrigatório" });
      }

      // Prepara o payload para o banco de dados (exatamente como mapLPToDb)
      const { id, name, template, status, visits, leads, leads_count, created_at, updated_at, conv, ...config } = page;
      
      const payload: Record<string, any> = {
        name: name || page.title || "Nova Landing Page",
        template: template || "Modern",
        status: status || "Ativa",
        visits: visits !== undefined ? Number(visits) : 0,
        leads_count: (leads_count ?? leads) !== undefined ? Number(leads_count ?? leads) : 0,
        config: {
          ...(config || {}),
          client_id: id || (config && config.id) || (config && config.client_id),
          slug: page.slug || (config && config.slug) || (page.title || name ? (page.title || name).toLowerCase().replace(/[^a-z0-9]+/g, "-") : undefined),
          surveyId: page.surveyId || (config && config.surveyId),
          externalUrl: page.externalUrl || (config && config.externalUrl)
        }
      };

      let finalId = id;

      if (id && isUUID(id)) {
        payload.id = id;
        const { error: upsertError } = await supabase.from("landing_pages").upsert([payload]);
        if (upsertError) {
          console.error("Upsert by id error in API:", upsertError);
        }
      } else {
        const pageName = name || page.title || "Nova Landing Page";
        const { data: existing } = await supabase
          .from("landing_pages")
          .select("id")
          .eq("name", pageName)
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          payload.id = existing.id;
          finalId = existing.id;
          const { error: updateError } = await supabase.from("landing_pages").update(payload).eq("id", existing.id);
          if (updateError) {
            console.error("Update by name error in API:", updateError);
          }
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("landing_pages")
            .insert([payload])
            .select("id")
            .single();
          if (inserted?.id) {
            payload.id = inserted.id;
            finalId = inserted.id;
          }
          if (insertError) {
            console.error("Insert error in API:", insertError);
          }
        }
      }

      const generatedToken = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const token = page.previewToken || (isUUID(finalId) ? finalId : generatedToken);
      const previewUrl = `/preview?pageId=${finalId}&token=${token}&v=${Date.now()}`;

      return res.status(200).json({
        success: true,
        previewUrl,
        token,
        pageId: finalId,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || "Erro ao salvar preview" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
