import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { currentLP, command, provider, apiKey, modelId } = await req.json()

    if (!apiKey) throw new Error("API Key não configurada.")

    const systemPrompt = `Você é o Engenheiro de Design da COMET. Sua missão é editar o JSON de uma Landing Page baseado no pedido do usuário.
    
    ESTADO ATUAL DA PÁGINA:
    ${JSON.stringify(currentLP, null, 2)}

    PEDIDO DO USUÁRIO: "${command}"

    REGRAS CRÍTICAS:
    1. Responda APENAS com o objeto JSON atualizado contendo TODOS os campos.
    2. Se o usuário pedir cores, use códigos hexadecimais que combinem bem.
    3. Se o usuário pedir para mudar o template, escolha entre: "Modern", "Minimal", "Glass", "Bold", "Corporate".
    4. Mantenha a estrutura de "features" e "stats" como arrays de objetos com ID.
    5. Não adicione textos explicativos, apenas o JSON bruto.

    MODELO DE RESPOSTA (JSON):
    {
      "template": "...",
      "headline": "...",
      "description": "...",
      "primaryColor": "...",
      "ctaText": "...",
      "features": [...],
      "stats": [...]
    }`;

    let textResponse = "";

    if (provider === 'google') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
      });
      const data = await response.json();
      textResponse = data.candidates[0].content.parts[0].text;
    } else {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId || "openai/gpt-4o-mini",
          messages: [{ role: "user", content: systemPrompt }]
        })
      });
      const data = await response.json();
      textResponse = data.choices[0].message.content;
    }

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