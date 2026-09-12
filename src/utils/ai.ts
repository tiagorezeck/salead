// src/utils/ai.ts

import { AIConfig, AIProvider } from '../types/ai';

export interface LANAgentRequest {
  prompt: string;
  currentLP: any;
  referenceImage?: string | null;
  referenceUrl?: string;
  conversationHistory?: Array<{ role: 'user' | 'lan' | 'model'; content: string }>;
  aiConfig?: AIConfig;
}

export interface LANAgentResponse {
  success: boolean;
  message: string;
  lp: any;
  providerUsed?: string;
  modelUsed?: string;
}

/**
 * System prompt that defines LAN agent behavior
 */
export const LAN_SYSTEM_PROMPT = `
Você é o "LAN", o Agente Autônomo Especialista em Criação e Customização de Landing Pages de Alta Conversão.
Você tem liberdade TOTAL e autonomia para criar, reestruturar, modificar e refinar Landing Pages conforme solicitado pelo usuário.

Instruções Principais:
1. Responda SEMPRE em formato JSON estrito conforme o schema abaixo.
2. Se o usuário pedir: "retire a imagem deixe só a de fundo", defina image="" na seção hero, ajuste bgImage com imagem de altíssima qualidade (Unsplash), bgOverlay para "dark-80" ou "gradient-to-right", e layoutVariant para "centered".
3. Se o usuário pedir VSL/vídeo, configure mediaType="video", videoUrl e ctaPrimary.
4. Use sempre imagens válidas em alta resolução do Unsplash (ex: https://images.unsplash.com/photo-...?w=1600&q=80&auto=format&fit=crop).
5. Estruture o JSON no seguinte formato:
{
  "message": "Uma mensagem direta e amigável em português explicando exatamente o que foi criado ou alterado.",
  "lp": {
    "name": "Nome da Landing Page",
    "theme": {
      "primary": "#FF6A00",
      "bg": "#0B0C10",
      "surface": "#12141A",
      "text": "#FFFFFF",
      "muted": "#9CA3AF",
      "radius": 16,
      "font": "sora"
    },
    "sections": [
      // seções: hero, stats, features, pricing, testimonial, form, faq, cta, logos, survey
    ]
  }
}
`;

/**
 * Execute completion using OpenRouter API
 */
export async function generateWithOpenRouter(
  prompt: string,
  systemPrompt: string,
  apiKey: string,
  modelId: string,
  referenceImage?: string | null
): Promise<string> {
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (referenceImage) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: referenceImage } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      'X-Title': 'LAN AI Landing Pages'
    },
    body: JSON.stringify({
      model: modelId || 'openai/gpt-4o-mini',
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '{}';
}

/**
 * Execute completion using Google Gemini REST API directly
 */
export async function generateWithGoogle(
  prompt: string,
  systemPrompt: string,
  apiKey: string,
  modelId: string,
  referenceImage?: string | null
): Promise<string> {
  const cleanModel = modelId.replace('google/', '').replace('models/', '');
  const finalModel = (!cleanModel || cleanModel.includes('gemini-1.5') || cleanModel.includes('gemini-2.0'))
    ? 'gemini-3.8-flash'
    : cleanModel;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`;

  const parts: any[] = [];
  
  if (referenceImage && referenceImage.startsWith('data:')) {
    const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  parts.push({ text: `${systemPrompt}\n\n${prompt}` });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Gemini Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

/**
 * Execute completion using Custom Paid OpenAI-compatible APIs (OpenAI, Anthropic proxy, Groq, DeepSeek)
 */
export async function generateWithCustomPaid(
  prompt: string,
  systemPrompt: string,
  apiKey: string,
  modelId: string,
  endpoint: string = 'https://api.openai.com/v1',
  referenceImage?: string | null
): Promise<string> {
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  const targetUrl = cleanEndpoint.endsWith('/chat/completions') 
    ? cleanEndpoint 
    : `${cleanEndpoint}/chat/completions`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (referenceImage) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: referenceImage } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId || 'gpt-4o',
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Custom API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '{}';
}

/**
 * Test AI API connection with a simple ping query
 */
export async function testAIConnection(
  provider: AIProvider,
  apiKey: string,
  modelId: string,
  endpoint?: string
): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const start = Date.now();
  try {
    let resultText = '';
    const testPrompt = 'Retorne um JSON com {"status": "ok", "message": "Conexão estabelecida com sucesso"}';
    const testSystem = 'Você é um validador de API. Responda apenas em JSON.';

    if (provider === 'google') {
      resultText = await generateWithGoogle(testPrompt, testSystem, apiKey, modelId);
    } else if (provider === 'openrouter') {
      resultText = await generateWithOpenRouter(testPrompt, testSystem, apiKey, modelId);
    } else {
      resultText = await generateWithCustomPaid(testPrompt, testSystem, apiKey, modelId, endpoint);
    }

    const latencyMs = Date.now() - start;
    return {
      success: true,
      latencyMs,
      message: `Conexão bem sucedida (${latencyMs}ms)`
    };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      message: err.message || 'Falha ao conectar na API.'
    };
  }
}
