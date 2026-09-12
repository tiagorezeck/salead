import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [update-settings] 📥 Requisição: ${req.method} | Origin: ${req.headers.get('origin')}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Validar Authorization Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error(`[${timestamp}] [update-settings] ❌ Authorization header ausente`);
      return new Response(JSON.stringify({ error: "Token de autorização não enviado" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Cliente Admin (Service Role) - IGNORA RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error(`[${timestamp}] [update-settings] ❌ ENV VARS FALTANDO: SUPABASE_URL ou SERVICE_ROLE_KEY`);
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    console.log(`[${timestamp}] [update-settings] ✅ Cliente Admin criado`);

    // 3. Validar JWT do usuário real
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error(`[${timestamp}] [update-settings] ❌ JWT Inválido:`, authError?.message);
      return new Response(JSON.stringify({ error: "Usuário não autenticado ou token inválido" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    console.log(`[${timestamp}] [update-settings] ✅ Usuário autenticado: ${user.id} (${user.email})`);

    // 4. Ler Payload
    let payload: Record<string, any>
    try {
      payload = await req.json()
      console.log(`[${timestamp}] [update-settings] 📦 Payload recebido:`, JSON.stringify(payload));
    } catch (e) {
      console.error(`[${timestamp}] [update-settings] ❌ JSON Inválido:`, e);
      return new Response(JSON.stringify({ error: "Body inválido" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 5. Upsert FORÇADO (Service Role ignora RLS)
    const upsertPayload = { 
      id: '00000000-0000-0000-0000-000000000000', 
      ...payload,
      updated_at: new Date().toISOString()
    }
    
    console.log(`[${timestamp}] [update-settings] 💾 Tentando upsert...`);
    const { error } = await supabaseAdmin
      .from('company_settings')
      .upsert(upsertPayload, { onConflict: 'id' })

    if (error) {
      console.error(`[${timestamp}] [update-settings] ❌ ERRO POSTGRES:`, error);
      return new Response(JSON.stringify({ error: `Erro no banco: ${error.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`[${timestamp}] [update-settings] ✅ SUCESSO: Salvo no banco!`);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error(`[${timestamp}] [update-settings] 💥 ERRO INESPERADO:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})