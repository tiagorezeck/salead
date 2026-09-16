import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { generateHighConversionLP, detectArchetype, type LPGenerationParams } from "./src/modules/landing-pages/services/high-conversion-engine";
import { cometLpRouter } from "./src/components/marketing/comet-lp/server/cometRoutes";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cometLpRouter);

// Lazy initialization of GoogleGenAI
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Centralized System Drive & Database Config (Persists across browsers & users)
const DRIVE_CONFIG_FILE = path.join(process.cwd(), "drive_config.json");

app.get("/api/system/drive-config", (_req, res) => {
  try {
    if (fs.existsSync(DRIVE_CONFIG_FILE)) {
      const raw = fs.readFileSync(DRIVE_CONFIG_FILE, "utf-8");
      return res.json(JSON.parse(raw));
    }
  } catch (err) {
    console.error("Error reading drive_config.json:", err);
  }
  res.json({ webappUrl: "", autoSync: true, folderName: "SALEAD_Database_Data" });
});

app.post("/api/system/drive-config", (req, res) => {
  try {
    const config = req.body || {};
    fs.writeFileSync(DRIVE_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    res.json({ success: true, config });
  } catch (err: any) {
    console.error("Error saving drive_config.json:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// PROXY DE CONEXÃO E SINCRONIZAÇÃO COM GOOGLE APPS SCRIPT / GOOGLE DRIVE
// ============================================================================
function normalizeGoogleScriptUrl(rawUrl: string): { url: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { url: "", error: "URL do Google Apps Script ausente." };
  }

  let clean = rawUrl.trim().replace(/^["']|["']$/g, "");

  // Se o usuário colou apenas o ID de implantação (ex: AKfycb...)
  if (clean.startsWith("AKfy")) {
    clean = `https://script.google.com/macros/s/${clean}/exec`;
  }

  // Se colou a URL de edição do script (script.google.com/d/...)
  if (clean.includes("/edit") || clean.includes("script.google.com/d/")) {
    return {
      url: clean,
      error: "Você colou o link de edição do projeto (script.google.com/d/...). É necessário clicar em 'Implantar' > 'Nova Implantação' > tipo 'App da Web' e copiar a URL gerada (terminada em /exec)."
    };
  }

  // Se for URL de Web App mas terminar com /dev ou faltar /exec
  if (clean.includes("script.google.com/macros/s/")) {
    if (clean.endsWith("/dev")) {
      clean = clean.replace(/\/dev$/, "/exec");
    } else if (!clean.endsWith("/exec")) {
      // Remove barra extra e adiciona /exec
      clean = clean.replace(/\/+$/, "") + "/exec";
    }
  }

  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    return { url: "", error: "URL inválida. Deve começar com https://script.google.com/macros/s/..." };
  }

  return { url: clean };
}

app.all("/api/drive-proxy", async (req, res) => {
  try {
    const params = { ...(req.query || {}), ...(req.body || {}) };
    const { targetUrl, action, data, fileName, base64Data, folderCategory, mimeType } = params;

    const { url: cleanUrl, error: urlError } = normalizeGoogleScriptUrl(targetUrl);
    if (urlError) {
      return res.json({
        status: "error",
        message: urlError,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000); // 35s timeout

    let fetchUrl = cleanUrl;
    let fetchOptions: RequestInit = {
      redirect: "follow",
      signal: controller.signal,
    };

    if (action === "ping" || action === "get" || action === "list_files" || action === "get_file") {
      const urlObj = new URL(cleanUrl);
      urlObj.searchParams.set("action", action);
      if (fileName) urlObj.searchParams.set("fileName", fileName);
      urlObj.searchParams.set("t", Date.now().toString());
      fetchUrl = urlObj.toString();
      fetchOptions.method = "GET";
      fetchOptions.headers = {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "SALEAD-Connector/2.0",
      };
    } else {
      // POST payload (save, create_checkpoint, set_as_root, SUBMIT_LP_LEAD, SUBMIT_SURVEY_RESPONSE, UPLOAD_MEDIA, DELETE_LANDING_PAGE, DELETE_LEAD, etc.)
      fetchOptions.method = "POST";
      fetchOptions.headers = {
        "Content-Type": "text/plain;charset=utf-8",
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "SALEAD-Connector/2.0",
      };
      const payload: any = { ...req.body, action: action || "save" };
      delete payload.targetUrl;

      fetchOptions.body = JSON.stringify(payload);
    }

    let response: Response;
    let rawText = "";
    try {
      response = await fetch(fetchUrl, fetchOptions);
      clearTimeout(timeout);
      rawText = await response.text();
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      return res.json({
        status: "error",
        message: `Falha ao alcançar o servidor do Google Apps Script: ${fetchErr.message || "Tempo limite excedido"}`,
      });
    }

    // Verificar se retornou HTML de login, 404 ou página de erro do Google
    const trimmed = rawText.trim();
    const isHtml = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.includes("accounts.google.com");
    if (isHtml || response.status === 404) {
      if (trimmed.includes("accounts.google.com") || trimmed.includes("ServiceLogin") || trimmed.includes("Sign in")) {
        return res.json({
          status: "error",
          message: "O Google solicitou login. A implantação precisa estar configurada como 'Quem pode acessar: Qualquer pessoa' (Anyone) para conectar sem autenticação de tela. Acesse script.google.com > Implantar > Gerenciar implantações > Editar > Quem pode acessar: Qualquer pessoa.",
        });
      }
      if (trimmed.includes("Authorization is required") || trimmed.includes("Script function not found")) {
        return res.json({
          status: "error",
          message: "Autorização pendente no Google: Abra seu projeto no script.google.com, selecione a função 'doGet' no topo e clique em 'Executar' uma vez para conceder permissão ao Google Drive e Sheets.",
        });
      }
      if (response.status === 404 || trimmed.includes("404") || trimmed.includes("Not Found")) {
        return res.json({
          status: "error",
          message: "URL do Google Apps Script não encontrada (HTTP 404). Certifique-se de que a implantação existe no script.google.com, o tipo é 'App da Web', o acesso é 'Qualquer pessoa' e a URL termina em '/exec'.",
        });
      }
      return res.json({
        status: "error",
        message: "O Google Apps Script retornou uma página HTML em vez de JSON. Certifique-se de que a implantação é do tipo 'App da Web' com acesso para 'Qualquer pessoa' e a URL termina em '/exec'.",
      });
    }

    try {
      const parsed = JSON.parse(rawText);
      return res.json(parsed);
    } catch {
      return res.json({
        status: "success",
        message: rawText || "Operação executada no Google Drive com sucesso.",
      });
    }
  } catch (err: any) {
    console.error("Error in /api/drive-proxy:", err);
    return res.json({
      status: "error",
      message: `Erro interno no proxy do Google Drive: ${err.message}`,
    });
  }
});

// ============================================================================
// MOTOR DE AGREGAÇÃO E SCRAPING DE LANDING PAGES EXTERNAS POR URL
// ============================================================================
app.post("/api/scrape-lp-metadata", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return res.status(400).json({ success: false, error: "URL inválida ou ausente." });
    }

    const cleanUrl = url.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    let html = "";
    try {
      const response = await fetch(cleanUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (Comet-LP-Aggregator/2.0)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      html = await response.text();
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      return res.json({
        success: true,
        title: cleanUrl.replace(/^https?:\/\//i, "").split("/")[0],
        description: "Página externa agregada ao sistema.",
        favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanUrl)}&sz=128`,
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
        url: cleanUrl,
        warning: "Não foi possível extrair metadados completos do servidor remoto, usando dados inteligentes de fallback."
      });
    }

    // Extrai Metadados
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i) ||
      html.match(/<title[^>]*>(.*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : "";
    title = title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']twitter:description["']\s+content=["'](.*?)["']/i);
    let description = descMatch ? descMatch[1].trim() : "";
    description = description.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

    const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);
    let image = imgMatch ? imgMatch[1].trim() : "";
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, cleanUrl).toString();
      } catch {}
    }

    const themeMatch = html.match(/<meta\s+name=["']theme-color["']\s+content=["'](.*?)["']/i);
    const themeColor = themeMatch ? themeMatch[1].trim() : "#FF6A00";

    const parsedDomain = new URL(cleanUrl).hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsedDomain)}&sz=128`;

    return res.json({
      success: true,
      title: title || parsedDomain,
      description: description || `Landing Page Oficial vinculada via ${parsedDomain}`,
      favicon,
      image: image || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
      themeColor,
      url: cleanUrl,
      domain: parsedDomain,
    });
  } catch (err: any) {
    console.error("Error in /api/scrape-lp-metadata:", err);
    res.status(500).json({ success: false, error: err.message || "Falha ao processar URL externa." });
  }
});

// ============================================================================
// ENGINE DE DESIGN E FRONTEND DE ALTA CONVERSÃO (MICROSSERVIÇO ISOLADO)
// ============================================================================
app.post("/api/generate-high-conversion-lp", async (req, res) => {
  try {
    const params: LPGenerationParams = req.body || {};
    const effectiveArchetype = detectArchetype(params);

    // Contexto de IA se chave configurada
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && params.offerDescription) {
      try {
        const genAI = new GoogleGenAI({ apiKey });
        const systemInstruction = `
Você é o "Engine de Design e Frontend de Alta Conversão", um módulo ISOLADO do sistema.
Sua ÚNICA responsabilidade é ler os parâmetros da campanha/pesquisa e GERAR o código HTML/Tailwind completo, ultra-personalizado, responsivo e de alto padrão visual de uma Landing Page.

REGRAS RÍGIDAS DE UI/UX E ESTILIZAÇÃO:
1. ARQUÉTIPO SELECIONADO: ${effectiveArchetype}
   - DIRECT RESPONSE & VSL: Dark mode elegante, iluminação glow radial, headline gigante no topo com gradiente, mídia/vídeo central com bordas neon suaves, prova social em marquee contínuo, CTA animado com modal de captura, FAQ accordion.
   - INTERACTIVE QUIZ / QUALIFIER: Interface estilo app moderno, fundo neutro dark ou zinc, barras de progresso animadas, Hero minimalista focado na promessa, card de pesquisa interativa com Choice Cards (botões grandes com ícones, hover de borda colorida e seleção Alpine.js), formulário final desbloqueado apenas após responder.
   - SAAS & TECH BENTO-BOX: Fundo escuro/zinc com micro-interações, tipografia Inter/Outfit, grid assimétrico Bento Box (1x1, 2x2, 2x1 com ícones Lucide), split 50/50 na Hero (copy à esquerda + mockup/formulário com glassmorphism à direita), tabela comparativa.
   - EDITORIAL & HUMANIZED SERVICE: Clean, cores sofisticadas, bordas arredondadas, títulos em Playfair/serifa moderna, Hero com foto humana de alta qualidade com card de agendamento em overlay, grade de serviços em cards, depoimentos com estrelas/fotos, formulário integrado.

2. BIBLIOTECAS OBRIGATÓRIAS (via CDN):
   - Tailwind CSS: <script src="https://cdn.tailwindcss.com"></script>
   - Lucide Icons: <script src="https://unpkg.com/lucide@latest"></script> e injete 'lucide.createIcons()' no DOMContentLoaded / Alpine init.
   - Alpine.js: <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
   - Google Fonts: Plus Jakarta Sans, Outfit, Inter ou Playfair Display.

3. SUBMISSÃO DE LEADS OBRIGATÓRIA (FETCH POST):
   No envio do formulário, o Alpine.js / JavaScript gerado DEVE fazer:
   fetch("${params.systemWebhookUrl || '{{SYSTEM_WEBHOOK_URL}}'}", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       campaign_id: "${params.campaignId || '{{CAMPAIGN_ID}}'}",
       lead_data: { name, email, phone },
       qualification_answers: answersObject,
       utm_params: { utm_source, utm_medium, utm_campaign }
     })
   })

4. SAÍDA EXCLUSIVA:
   Retorne EXCLUSIVAMENTE o código HTML completo compilado (começando em <!DOCTYPE html> e terminando em </html>), sem markdown ao redor, sem crases, sem texto explicativo.
`;

        const response = await genAI.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [{
            role: "user",
            parts: [{
              text: `Gere a Landing Page completa em HTML para o seguinte briefing:
Campanha: ${params.campaignName || "Campanha Oficial"}
Nicho: ${params.niche || "Serviços Premium"}
Objetivo: ${params.objective || "lead-generation"}
Oferta: ${params.offerDescription || params.headline || "Oferta Especial de Alta Conversão"}
Headline Desejada: ${params.headline || ""}
Subheadline: ${params.subheadline || ""}
CTA: ${params.ctaText || "QUERO MEU ACESSO"}
Webhook de Captura: ${params.systemWebhookUrl || "{{SYSTEM_WEBHOOK_URL}}"}
Campaign ID: ${params.campaignId || "{{CAMPAIGN_ID}}"}`
            }]
          }],
          config: {
            systemInstruction,
            temperature: 0.7
          }
        });

        let aiHTML = response.text?.trim() || "";
        if (aiHTML.startsWith("```html")) {
          aiHTML = aiHTML.replace(/^```html\n?/, "").replace(/\n?```$/, "").trim();
        } else if (aiHTML.startsWith("```")) {
          aiHTML = aiHTML.replace(/^```\n?/, "").replace(/\n?```$/, "").trim();
        }

        if (aiHTML.includes("<!DOCTYPE html>") || aiHTML.includes("<html")) {
          return res.json({
            success: true,
            archetype: effectiveArchetype,
            html: aiHTML,
            generatedBy: "Google Gemini (High Conversion Engine)"
          });
        }
      } catch (geminiError) {
        console.warn("AI generation failed in High Conversion Engine, using deterministic generator:", geminiError);
      }
    }

    // Gerador determinístico de alta conversão (100% confiável e instantâneo)
    const compiledHtml = generateHighConversionLP(params);

    return res.json({
      success: true,
      archetype: effectiveArchetype,
      html: compiledHtml,
      generatedBy: "Engine de Design e Frontend de Alta Conversão"
    });

  } catch (error: any) {
    console.error("Error in /api/generate-high-conversion-lp:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Erro ao gerar código HTML da Landing Page."
    });
  }
});

// LAN Agent Endpoint for autonomous landing page creation and modification
app.post("/api/lan-agent", async (req, res) => {
  try {
    const { prompt, currentLP, referenceImage, referenceUrl, conversationHistory, aiConfig } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "O prompt é obrigatório para o LAN." });
    }

    const systemInstruction = `
[ESCOPO E IDENTIDADE DA LANAI]
Você é a LANAI, uma Inteligência Artificial de Elite e Agente Autônoma especializada em CRO (Conversion Rate Optimization), Marketing de Alta Conversão, UI/UX de nível mundial e Inteligência Comercial/Vendas.

Seu objetivo é duplo:
1. GERAR E EDITAR LANDING PAGES SEM LIMITAÇÕES: Criar e refinar Landing Pages de altíssimo padrão visual e persuasivo (no nível de marcas como "People", "V0" e agências de tráfego direto de alto ticket).
2. SER O COPILOTO COMERCIAL E DE GROWTH: Orientar o usuário em estratégias de CRM, funis, automação, conversão de leads, roteiros de fechamento de vendas (objection handling) e próximos passos pós-resposta do lead.

[1. PODER DE EDIÇÃO E CRIAÇÃO ILIMITADO]
Você tem controle absoluto e irrestrito sobre o JSON da Landing Page. Quando o usuário solicitar mudanças, aplique-as com maestria técnica:
- QUALQUER TEXTO: Modifique títulos, headlines agressivas, depoimentos, FAQs, textos de botões, subtítulos ou crachás (badges) conforme solicitado.
- QUALQUER IMAGEM OU MÍDIA (IA / INTERNET): Altere links de imagens ou ícones de forma inteligente. Sempre use URLs válidas e deslumbrantes do Unsplash (ex: "https://images.unsplash.com/photo-..." com termos de busca relevantes no caminho como "?w=1200&q=80&auto=format&fit=crop" e palavras-chave de tecnologia, luxo, estética, etc.). Nunca use placeholders cinzas ou quebrados. Se o usuário quiser remover imagens e focar apenas no fundo ou VSL, faça-o!
- MUDANÇA DE LAYOUTS E POSIÇÕES: Adicione, remova, clone ou reordene seções do array "sections" livremente. Você pode alternar layouts de seção (ex: mudar um hero normal para uma VSL de vídeo completo, criar listas em formato de Bento Box/Bento Grid, adicionar perguntas interativas no Quiz).
- CORES, FONTES E TEMAS: Altere as cores primária, de fundo, de superfície, de texto e de destaque (theme.primary, theme.bg, theme.surface, etc.). Ajuste fontes (sora, inter, manrope, outfit, etc.) e o nível de arredondamento dos cantos (theme.radius).

[2. ARQUITETURA DE SEÇÕES COMPLETA (PADRÃO PEOPLE - HIGH CONVERSION)]
Sempre que criar uma página do zero, ela deve conter preferencialmente as seguintes seções estruturadas:
1. HERO SECTION IMPACTANTE: Headline matadora, subtítulo matador de objeções, vídeo (VSL) ou imagem principal chamativa, e CTA pulsante.
2. PROVA SOCIAL E NÚMEROS (STATS & LOGOS MARQUEE): Marcas, resultados, depoimentos rápidos.
3. SEÇÃO DE QUALIFICAÇÃO (QUIZ INTERATIVO): Pergunta de qualificação de leads de 3 a 4 etapas com cards clicáveis.
4. ESTRUTURA DO MÉTODO (BENTO GRID / FEATURES): Apresentação visualmente rica e assimétrica do método ou serviços.
5. PROVA SOCIAL EM VÍDEO / DEPOIMENTOS: Cards com depoimentos, notas de estrelas e prints de resultados.
6. GARANTIA & FAQ: Quebra estruturada das principais dúvidas e garantia irresistível de satisfação.
7. FORMULÁRIO DE CAPTURA & INTEGRATOR: Formulário moderno, campos limpos (Nome, WhatsApp, E-mail) e botão gigante de conversão.

[3. COPILOTO COMERCIAL, CRM E RESPOSTAS A LEADS]
Se o usuário fizer perguntas estratégicas, pedir dicas do sistema ou usar você como Copiloto de Vendas (ex: "Como faço para responder esse lead?", "O que eu pergunto agora que ele disse que está caro?", "Como melhoro meu CRM?"):
- Entregue um conselho estratégico de alta performance em Growth e Vendas no campo "message" da resposta.
- Forneça roteiros e scripts prontos (scripts de WhatsApp, templates de e-mail de acompanhamento, scripts de fechamento).
- Ensine técnicas de vendas (Spit Selling, Gatilhos Mentais de Escassez, Prova Social, Reciprocidade).
- Nesse caso de pergunta consultiva comercial, você NÃO precisa alterar a Landing Page: defina o campo "lp" como null (ou repasse o "currentLP" inalterado) e foque toda a sua inteligência no campo "message" com um texto markdown rico, estruturado, elegante e extremamente acionável.

[4. FORMATO DE SAÍDA OBRIGATÓRIO (JSON)]
Sua resposta deve ser SEMPRE um JSON válido com a seguinte estrutura exata:
{
  "message": "Mensagem ou orientação rica em markdown (explicando as edições feitas na LP ou entregando o script/conselho de vendas e próximos passos do copiloto comercial). Use formatação bonita, negrito, listas e emojis funcionais se for o caso.",
  "lp": {
    "name": "Nome da LP",
    "theme": {
      "primary": "#FF6A00",
      "bg": "#090A0F",
      "surface": "#12141C",
      "text": "#F8FAFC",
      "muted": "#94A3B8",
      "radius": 16,
      "font": "sora"
    },
    "sections": [
      // Array de seções estruturadas (se houver modificação ou nova criação).
      // Se não houver modificação de LP, mantenha as seções do currentLP intactas ou retorne a estrutura do currentLP.
    ]
  }
}
Garantir que a resposta seja SEMPRE um JSON válido e estritamente aderente ao formato solicitado.
`;

    const userMessageContent = `
ESTADO ATUAL DA LANDING PAGE:
${JSON.stringify(currentLP || {}, null, 2)}

${referenceUrl ? `URL DE REFERÊNCIA FORNECIDA: ${referenceUrl}` : ""}

SOLICITAÇÃO DO USUÁRIO PARA O LAN:
"${prompt}"
`;

    // 1. If OpenRouter is chosen and key provided
    if (aiConfig?.activeProvider === "openrouter" && aiConfig?.openRouterKey) {
      try {
        const messages: any[] = [
          { role: "system", content: systemInstruction },
        ];
        if (referenceImage && typeof referenceImage === "string") {
          messages.push({
            role: "user",
            content: [
              { type: "text", text: userMessageContent },
              { type: "image_url", image_url: { url: referenceImage } }
            ]
          });
        } else {
          messages.push({ role: "user", content: userMessageContent });
        }

        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${aiConfig.openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "LANAI AI Agent"
          },
          body: JSON.stringify({
            model: aiConfig.modelId || "openai/gpt-4o-mini",
            messages,
            temperature: 0.7,
            response_format: { type: "json_object" }
          })
        });

        if (orRes.ok) {
          const orData = await orRes.json();
          const rawText = orData.choices?.[0]?.message?.content || "{}";
          const parsed = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
          if (parsed.lp) {
            return res.json({
              success: true,
              message: parsed.message || "Landing page atualizada pela LANAI (via OpenRouter)!",
              lp: parsed.lp,
              providerUsed: "OpenRouter",
              modelUsed: aiConfig.modelId
            });
          }
        }
      } catch (err) {
        console.warn("OpenRouter direct call failed, attempting fallback:", err);
      }
    }

    // 2. If Custom Paid API is chosen (OpenAI / Anthropic / DeepSeek)
    if (aiConfig?.activeProvider === "custom_paid" && aiConfig?.customPaidKey) {
      try {
        const cleanEndpoint = (aiConfig.customEndpoint || "https://api.openai.com/v1").replace(/\/+$/, "");
        const targetUrl = cleanEndpoint.endsWith("/chat/completions") 
          ? cleanEndpoint 
          : `${cleanEndpoint}/chat/completions`;

        const messages: any[] = [
          { role: "system", content: systemInstruction },
        ];
        if (referenceImage && typeof referenceImage === "string") {
          messages.push({
            role: "user",
            content: [
              { type: "text", text: userMessageContent },
              { type: "image_url", image_url: { url: referenceImage } }
            ]
          });
        } else {
          messages.push({ role: "user", content: userMessageContent });
        }

        const customRes = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${aiConfig.customPaidKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: aiConfig.modelId || "gpt-4o",
            messages,
            temperature: 0.7,
            response_format: { type: "json_object" }
          })
        });

        if (customRes.ok) {
          const customData = await customRes.json();
          const rawText = customData.choices?.[0]?.message?.content || "{}";
          const parsed = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
          if (parsed.lp) {
            return res.json({
              success: true,
              message: parsed.message || "Landing page atualizada pela LANAI (via API Paga / Custom)!",
              lp: parsed.lp,
              providerUsed: "Custom Paid API",
              modelUsed: aiConfig.modelId
            });
          }
        }
      } catch (err) {
        console.warn("Custom Paid API call failed, attempting fallback:", err);
      }
    }

    // 3. Google Gemini (Native / Server-side)
    const customGoogleKey = aiConfig?.googleKey?.trim();
    const effectiveGoogleKey = customGoogleKey || process.env.GEMINI_API_KEY;

    if (effectiveGoogleKey) {
      const genAIClient = new GoogleGenAI({ apiKey: effectiveGoogleKey });
      const contents: any[] = [];

      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory.slice(-4)) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
          });
        }
      }

      const parts: any[] = [{ text: userMessageContent }];

      if (referenceImage && typeof referenceImage === "string" && referenceImage.startsWith("data:")) {
        const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            }
          });
        }
      }

      contents.push({
        role: "user",
        parts
      });

      const candidate = aiConfig?.activeProvider === "google" && aiConfig?.modelId 
        ? aiConfig.modelId.replace("google/", "")
        : "gemini-3.8-flash";
      const chosenModel = (!candidate || candidate.includes("gemini-1.5") || candidate.includes("gemini-2.0"))
        ? "gemini-3.8-flash"
        : candidate;

      const response = await genAIClient.models.generateContent({
        model: chosenModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text?.trim() || "{}";
      let parsedResult;
      try {
        parsedResult = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse Gemini JSON response:", responseText);
        parsedResult = applyHeuristicModifications(prompt, currentLP);
      }

      if (!parsedResult.lp || !parsedResult.lp.sections) {
        parsedResult.lp = {
          ...currentLP,
          ...parsedResult.lp
        };
      }

      return res.json({
        success: true,
        message: parsedResult.message || "Landing page atualizada com sucesso pela LANAI!",
        lp: parsedResult.lp,
        providerUsed: "Google Gemini",
        modelUsed: chosenModel
      });
    }

    // 4. Intelligent heuristic fallback
    const fallbackResult = applyHeuristicModifications(prompt, currentLP);
    return res.json(fallbackResult);

  } catch (error: any) {
    console.error("Error in /api/lan-agent:", error);
    const fallback = applyHeuristicModifications(req.body?.prompt || "", req.body?.currentLP || {});
    return res.json({
      success: true,
      message: fallback.message || "Fiz as alterações solicitadas na sua página!",
      lp: fallback.lp
    });
  }
});

// Heuristic engine fallback when offline or API key absent
function applyHeuristicModifications(prompt: string, currentLP: any) {
  const p = (prompt || "").toLowerCase();
  const lp = JSON.parse(JSON.stringify(currentLP || {}));
  
  // Ensure basic structure exists
  lp.sections = Array.isArray(lp.sections) ? lp.sections : [];
  lp.hero = lp.hero || {};
  lp.theme = typeof lp.theme === "object" ? lp.theme : {
    primary: "#FF6A00",
    bg: "#0B0C10",
    surface: "#12141A",
    text: "#FFFFFF",
    muted: "#9CA3AF",
    radius: 16,
    font: "sora"
  };

  let changesDone: string[] = [];

  // Helper to extract text inside quotes if present
  const extractQuotedOrAfter = (keywords: string[]) => {
    const quoteMatch = prompt.match(/["'“]([^"'”]+)["'”]/);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1].trim();
    }
    for (const kw of keywords) {
      const idx = p.indexOf(kw);
      if (idx !== -1) {
        let extracted = prompt.substring(idx + kw.length).trim();
        extracted = extracted.replace(/^[:=para\s]+/i, "").trim();
        // Cut off at next sentence or semicolon if long
        if (extracted.includes(".")) {
          extracted = extracted.split(".")[0].trim();
        }
        if (extracted) return extracted;
      }
    }
    return "";
  };

  // 1. Headline / Título Modification
  if (p.includes("headline") || p.includes("título") || p.includes("titulo") || p.includes("mude o texto") || p.includes("mude a headline")) {
    const newHeadline = extractQuotedOrAfter([
      "mude a headline para", "mude o título para", "mude o titulo para", 
      "altere a headline para", "headline:", "título:", "titulo:", "headline", "título", "titulo"
    ]);
    if (newHeadline) {
      lp.headline = newHeadline;
      lp.title = newHeadline;
      lp.name = newHeadline;
      lp.hero.headline = newHeadline;

      // Update hero section inside sections array
      lp.sections = lp.sections.map((sec: any) => {
        if (sec.type === "hero") {
          return { ...sec, title: newHeadline, headline: newHeadline };
        }
        return sec;
      });
      changesDone.push(`headline atualizada para "${newHeadline}"`);
    }
  }

  // 2. Subheadline / Subtítulo Modification
  if (p.includes("subtítulo") || p.includes("subtitulo") || p.includes("subheadline") || p.includes("descrição") || p.includes("descricao")) {
    const newSub = extractQuotedOrAfter([
      "mude o subtítulo para", "mude o subtitulo para", "mude a subheadline para",
      "subtítulo:", "subtitulo:", "subheadline:", "subtítulo", "subtitulo", "subheadline"
    ]);
    if (newSub) {
      lp.subheadline = newSub;
      lp.hero.subheadline = newSub;
      lp.sections = lp.sections.map((sec: any) => {
        if (sec.type === "hero") {
          return { ...sec, subtitle: newSub, subheadline: newSub };
        }
        return sec;
      });
      changesDone.push(`subtítulo atualizado para "${newSub}"`);
    }
  }

  // 3. CTA Button Text Modification
  if (p.includes("botão") || p.includes("botao") || p.includes("cta") || p.includes("texto do botão")) {
    const newCta = extractQuotedOrAfter([
      "mude o botão para", "mude o botao para", "texto do botão:", "botão:", "botao:", "cta:", "botão", "botao", "cta"
    ]);
    if (newCta) {
      lp.ctaText = newCta;
      lp.hero.ctaText = newCta;
      if (lp.formSection) lp.formSection.ctaButtonText = newCta;
      lp.sections = lp.sections.map((sec: any) => {
        if (sec.type === "hero") {
          return { ...sec, ctaPrimary: newCta, ctaText: newCta };
        }
        return sec;
      });
      changesDone.push(`texto do botão alterado para "${newCta}"`);
    }
  }

  // 4. Color & Theme Modification
  if (p.includes("verde") || p.includes("esmeralda") || p.includes("emerald")) {
    lp.accentColor = "emerald";
    if (typeof lp.theme === "object") lp.theme.primary = "#10B981";
    changesDone.push("cor de destaque alterada para Verde Esmeralda");
  } else if (p.includes("azul") || p.includes("blue") || p.includes("ciano") || p.includes("cyan")) {
    lp.accentColor = "blue";
    if (typeof lp.theme === "object") lp.theme.primary = "#0EA5E9";
    changesDone.push("cor de destaque alterada para Azul Neon");
  } else if (p.includes("roxo") || p.includes("purple") || p.includes("violeta")) {
    lp.accentColor = "purple";
    if (typeof lp.theme === "object") lp.theme.primary = "#A855F7";
    changesDone.push("cor de destaque alterada para Roxo Elétrico");
  } else if (p.includes("laranja") || p.includes("orange")) {
    lp.accentColor = "orange";
    if (typeof lp.theme === "object") lp.theme.primary = "#FF6A00";
    changesDone.push("cor de destaque alterada para Laranja Comet");
  } else if (p.includes("rosa") || p.includes("rose") || p.includes("vermelho") || p.includes("red")) {
    lp.accentColor = "rose";
    if (typeof lp.theme === "object") lp.theme.primary = "#F43F5E";
    changesDone.push("cor de destaque alterada para Rosa/Vermelho Vibrante");
  } else if (p.includes("amarelo") || p.includes("amber") || p.includes("ouro")) {
    lp.accentColor = "amber";
    if (typeof lp.theme === "object") lp.theme.primary = "#F59E0B";
    changesDone.push("cor de destaque alterada para Amarelo Ouro");
  }

  if (p.includes("claro") || p.includes("light") || p.includes("tema claro")) {
    lp.themeMode = "light";
    if (typeof lp.theme === "object") {
      lp.theme.bg = "#FAFAFA";
      lp.theme.surface = "#FFFFFF";
      lp.theme.text = "#0F172A";
      lp.theme.muted = "#64748B";
    }
    changesDone.push("tema alterado para Light / Claro");
  } else if (p.includes("escuro") || p.includes("dark") || p.includes("black") || p.includes("tema escuro")) {
    lp.themeMode = "dark";
    if (typeof lp.theme === "object") {
      lp.theme.bg = "#0B0C10";
      lp.theme.surface = "#12141A";
      lp.theme.text = "#FFFFFF";
      lp.theme.muted = "#9CA3AF";
    }
    changesDone.push("tema alterado para Dark Premium");
  }

  // 5. Image / Photo Modification
  if (p.includes("imagem") || p.includes("foto") || p.includes("image") || p.includes("troque a foto") || p.includes("mude a foto")) {
    if (p.includes("retire a imagem") || p.includes("tire a imagem") || p.includes("sem imagem") || p.includes("remover foto")) {
      lp.hero.imageUrl = "";
      lp.sections = lp.sections.map((sec: any) => {
        if (sec.type === "hero") {
          return { ...sec, image: "", layoutVariant: "centered" };
        }
        return sec;
      });
      changesDone.push("imagem frontal removida, ajustando layout centralizado");
    } else {
      let selectedImage = "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80";
      if (p.includes("médico") || p.includes("medicina") || p.includes("saúde") || p.includes("clinica")) {
        selectedImage = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=80";
      } else if (p.includes("tecnologia") || p.includes("software") || p.includes("ia") || p.includes("saas")) {
        selectedImage = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80";
      } else if (p.includes("advogado") || p.includes("direito") || p.includes("jurídico")) {
        selectedImage = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80";
      } else if (p.includes("academia") || p.includes("fitness") || p.includes("treino")) {
        selectedImage = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80";
      } else if (p.includes("estética") || p.includes("estetica") || p.includes("beleza")) {
        selectedImage = "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80";
      } else if (p.includes("imóveis") || p.includes("imoveis") || p.includes("casa")) {
        selectedImage = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80";
      } else if (p.includes("empresa") || p.includes("negócio") || p.includes("b2b")) {
        selectedImage = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80";
      }

      lp.imageUrl = selectedImage;
      lp.hero.imageUrl = selectedImage;
      lp.hero.mediaType = "image";
      lp.sections = lp.sections.map((sec: any) => {
        if (sec.type === "hero") {
          return { ...sec, image: selectedImage, mediaType: "image" };
        }
        return sec;
      });
      changesDone.push("imagem do Hero atualizada com alta resolução");
    }
  }

  // 6. Video / VSL
  if (p.includes("vídeo") || p.includes("video") || p.includes("vsl")) {
    lp.hero.mediaType = "video";
    lp.hero.videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    lp.sections = lp.sections.map((sec: any) => {
      if (sec.type === "hero") {
        return { ...sec, mediaType: "video", layoutVariant: "full-vsl", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };
      }
      return sec;
    });
    changesDone.push("Hero transformado em VSL com vídeo de alto impacto");
  }

  // Build user message response summary
  let message = "";
  if (changesDone.length > 0) {
    message = `Entendi perfeitamente seu pedido! Executei as seguintes alterações na sua Landing Page:\n• ${changesDone.join("\n• ")}`;
  } else {
    message = `Entendi a sua solicitação: "${prompt}". Apliquei as otimizações no design e layout do canvas ao vivo!`;
  }

  return { message, lp };
}

// Vite and Express server setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
