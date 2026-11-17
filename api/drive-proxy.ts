import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";
import { GLOBAL_GAS_CONFIG } from "../src/config/gasConfig";

function normalizeGoogleScriptUrl(rawUrl: string): { url: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { url: "", error: "URL do Google Apps Script ausente." };
  }

  let clean = rawUrl.trim().replace(/^["']|["']$/g, "");

  if (clean.startsWith("AKfy")) {
    clean = `https://script.google.com/macros/s/${clean}/exec`;
  }

  clean = clean.replace(
    /https:\/\/script\.google\.com\/macros\/u\/\d+\/s\//i,
    "https://script.google.com/macros/s/"
  );

  if (clean.includes("/edit") || clean.includes("script.google.com/d/")) {
    return {
      url: clean,
      error:
        "Você colou o link de edição do projeto (script.google.com/d/...). É necessário clicar em 'Implantar' > 'Nova Implantação' > tipo 'App da Web' e copiar a URL gerada (terminada em /exec).",
    };
  }

  if (clean.includes("script.google.com/macros/s/")) {
    if (clean.endsWith("/dev")) {
      clean = clean.replace(/\/dev$/, "/exec");
    } else if (!clean.endsWith("/exec") && !clean.includes("/exec?")) {
      clean = clean.replace(/\/+$/, "") + "/exec";
    }
  }

  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    return {
      url: "",
      error: "URL inválida. Deve começar com https://script.google.com/macros/s/...",
    };
  }

  return { url: clean };
}

function getFallbackConfig(): { url: string; token: string } {
  const candidates = [
    path.join("/tmp", "drive_config.json"),
    path.join("/tmp", "server-config.json"),
    path.join(process.cwd(), "drive_config.json"),
    path.join(process.cwd(), "server-config.json"),
  ];

  let fileUrl = "";
  let fileToken = "";
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (!fileUrl && (parsed.webappUrl || parsed.WEBAPP_URL)) {
          fileUrl = parsed.webappUrl || parsed.WEBAPP_URL;
        }
        if (!fileToken && (parsed.apiToken || parsed.API_TOKEN)) {
          fileToken = parsed.apiToken || parsed.API_TOKEN;
        }
      }
    } catch {}
  }

  return {
    url:
      process.env.GAS_WEBAPP_URL ||
      process.env.VITE_GAS_WEBAPP_URL ||
      fileUrl ||
      GLOBAL_GAS_CONFIG.WEBAPP_URL ||
      "",
    token:
      process.env.DRIVE_API_SECRET ||
      process.env.GAS_API_TOKEN ||
      fileToken ||
      GLOBAL_GAS_CONFIG.API_TOKEN ||
      "",
  };
}

const GET_ACTIONS = new Set([
  "ping",
  "test",
  "get",
  "GET_DATABASE",
  "LOAD_DATABASE",
  "GET_PUBLIC_LP",
  "GET_LP_BY_SLUG",
  "GET_PUBLIC_SURVEY",
  "RECORD_LP_VISIT",
  "INCREMENT_LP_VISIT",
  "lp_visit",
  "list_files",
  "get_file",
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const query = req.query || {};
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const params: any = { ...query, ...body };

    const fallback = getFallbackConfig();
    const rawTargetUrl = params.targetUrl || params.webappUrl || fallback.url;

    const { url: cleanUrl, error: urlError } = normalizeGoogleScriptUrl(rawTargetUrl);
    if (urlError || !cleanUrl) {
      return res.status(200).json({
        status: "error",
        message: urlError || "URL do Google Apps Script não configurada.",
      });
    }

    const action = String(params.action || (req.method === "GET" ? "get" : "save"));
    const apiToken =
      params.apiToken ||
      params.token ||
      (req.headers["x-api-token"] as string) ||
      (typeof req.headers["authorization"] === "string"
        ? req.headers["authorization"].replace(/^Bearer\s+/i, "")
        : "") ||
      fallback.token;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    let fetchUrl = cleanUrl;
    const fetchOptions: RequestInit = {
      redirect: "follow",
      signal: controller.signal,
    };

    const useGet =
      req.method === "GET" ||
      (GET_ACTIONS.has(action) &&
        !body.data &&
        !body.lead &&
        !body.surveyResponse &&
        !body.base64Data);

    if (useGet && GET_ACTIONS.has(action)) {
      const urlObj = new URL(cleanUrl);
      urlObj.searchParams.set("action", action);
      if (params.fileName) urlObj.searchParams.set("fileName", String(params.fileName));
      if (params.id) urlObj.searchParams.set("id", String(params.id));
      if (params.lpId) urlObj.searchParams.set("lpId", String(params.lpId));
      if (params.slug) urlObj.searchParams.set("slug", String(params.slug));
      if (params.title) urlObj.searchParams.set("title", String(params.title));
      if (params.surveyId) urlObj.searchParams.set("surveyId", String(params.surveyId));
      if (params.nocache) urlObj.searchParams.set("nocache", String(params.nocache));
      if (params.source) urlObj.searchParams.set("source", String(params.source));
      if (params.spreadsheetId) urlObj.searchParams.set("spreadsheetId", String(params.spreadsheetId));
      if (apiToken) urlObj.searchParams.set("token", String(apiToken));
      urlObj.searchParams.set("t", Date.now().toString());
      fetchUrl = urlObj.toString();
      fetchOptions.method = "GET";
      fetchOptions.headers = {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "SALEAD-Connector/3.0",
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      };
    } else {
      fetchOptions.method = "POST";
      fetchOptions.headers = {
        "Content-Type": "text/plain;charset=utf-8",
        Accept: "application/json, text/plain, */*",
        "User-Agent": "SALEAD-Connector/3.0",
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      };
      const payload: any = { ...body, action };
      delete payload.targetUrl;
      delete payload.webappUrl;
      if (apiToken && !payload.token && !payload.apiToken) {
        payload.token = apiToken;
      }
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
      return res.status(200).json({
        status: "error",
        message: `Falha ao alcançar o servidor do Google Apps Script: ${fetchErr.message || "Tempo limite excedido"}`,
      });
    }

    const trimmed = rawText.trim();
    const isHtml =
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.startsWith("<html") ||
      trimmed.includes("accounts.google.com");

    if (isHtml || response.status === 404 || response.status === 429) {
      if (
        response.status === 429 ||
        trimmed.includes("too many scripts running simultaneously") ||
        trimmed.includes("Servidor ocupado")
      ) {
        return res.status(200).json({
          status: "busy",
          message:
            "O Google Apps Script está temporariamente ocupado. Tentando novamente em instantes.",
        });
      }
      if (
        trimmed.includes("accounts.google.com") ||
        trimmed.includes("ServiceLogin") ||
        trimmed.includes("Sign in")
      ) {
        return res.status(200).json({
          status: "error",
          message:
            "O Google solicitou login. A implantação precisa estar configurada como 'Quem pode acessar: Qualquer pessoa' (Anyone).",
        });
      }
      if (
        trimmed.includes("Authorization is required") ||
        trimmed.includes("Script function not found")
      ) {
        return res.status(200).json({
          status: "error",
          message:
            "Autorização pendente no Google: Abra seu projeto no script.google.com, selecione a função 'doGet' e clique em 'Executar' uma vez para conceder permissão.",
        });
      }
      if (response.status === 404 || trimmed.includes("404") || trimmed.includes("Not Found")) {
        return res.status(200).json({
          status: "error",
          message:
            "URL do Google Apps Script não encontrada (HTTP 404). Verifique se a implantação está publicada como 'App da Web' e termina em '/exec'.",
        });
      }
      return res.status(200).json({
        status: "error",
        message:
          "O Google Apps Script retornou uma página HTML em vez de JSON. Certifique-se de que a implantação é do tipo 'App da Web' com acesso para 'Qualquer pessoa' e a URL termina em '/exec'.",
      });
    }

    try {
      const parsed = JSON.parse(rawText);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json({
        status: "success",
        message: rawText || "Operação executada no Google Drive com sucesso.",
      });
    }
  } catch (err: any) {
    return res.status(200).json({
      status: "error",
      message: `Erro no proxy Vercel: ${err.message}`,
    });
  }
}
