import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt, companyContext, provider, apiKey, type, modelId } = await req.json()

    if (!apiKey) throw new Error("API Key não configurada.")

    const systemPrompt = `Você é um Copywriter de Elite. Gere uma Landing Page de alta conversão.
    EMPRESA: ${companyContext.name} (${companyContext.sector})
    PRODUTO/CAMPANHA: ${prompt}
    TIPO: ${type}

    Responda EXCLUSIVAMENTE com um objeto JSON seguindo este modelo, sem textos antes ou depois:
    {
      "headline": "Título",
      "description": "Subtítulo",
      "badgeText": "Selo",
      "ctaText": "Botão",
      "features": [{"id":"f1","title":"X","desc":"Y"}],
      "stats": [{"id":"s1","label":"A","value":"B"}]
    }`;

    let textResponse = "";

    if (provider === 'google') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });
      const data = await response.json();
      textResponse = data.candidates[0].content.parts[0].text;
    } else {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelId || "openai/gpt-4o-mini",
          messages: [{ role: "user", content: systemPrompt }]
        })
      });
      const data = await response.json();
      textResponse = data.choices[0].message.content;
    }

    // LIMPEZA CRÍTICA: Remove blocos de código markdown se existirem
    const cleanedJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanedJson);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})