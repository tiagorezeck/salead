import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { table, record, type } = payload

    console.log(`[automation] Evento detectado em ${table}: ${type}`)

    // Lógica: Se um lead foi criado, procura automações do tipo 'lead.created'
    if (table === 'leads' && type === 'INSERT') {
      const { data: autos } = await supabase
        .from('automations')
        .select('*')
        .eq('trigger_event', 'lead.created')
        .eq('active', true)

      for (const auto of autos || []) {
        console.log(`[automation] Executando: ${auto.name}`)
        
        // Exemplo: Criar tarefa automática
        if (auto.action_type === 'create_task') {
          await supabase.from('tasks').insert([{
            title: auto.action_config.title || "Tarefa Automática",
            lead: record.company,
            owners: [record.owner],
            due: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            priority: auto.priority
          }])
        }

        // Incrementa contador de execuções
        await supabase.from('automations').update({ runs: (auto.runs || 0) + 1 }).eq('id', auto.id)
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})