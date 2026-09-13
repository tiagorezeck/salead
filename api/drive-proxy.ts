import type { VercelRequest, VercelResponse } from "@vercel/node";

function normalizeGoogleScriptUrl(rawUrl: string): { url: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { url: "", error: "URL do Google Apps Script ausente." };
  }

  let clean = rawUrl.trim().replace(/^["']|["']$/g, "");

  if (clean.startsWith("AKfy")) {
    clean = `https://script.google.com/macros/s/${clean}/exec`;
  }

  if (clean.includes("/edit") || clean.includes("script.google.com/d/")) {
    return {
      url: clean,
      error: "Você colou o link de edição do projeto (script.google.com/d/...). É necessário clicar em 'Implantar' > 'Nova Implantação' > tipo 'App da Web' e copiar a URL gerada (terminada em /exec)."
    };
  }

  if (clean.includes("script.google.com/macros/s/")) {
    if (clean.endsWith("/dev")) {
      clean = clean.replace(/\/dev$/, "/exec");
    } else if (!clean.endsWith("/exec")) {
      clean = clean.replace(/\/+$/, "") + "/exec";
    }
  }

  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    return { url: "", error: "URL inválida. Deve começar com https://script.google.com/macros/s/..." };
  }

  return { url: clean };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { targetUrl, action, data, fileName, base64Data, folderCategory, mimeType, lead, surveyResponse } = body;

    const { url: cleanUrl, error: urlError } = normalizeGoogleScriptUrl(targetUrl);
    if (urlError) {
      return res.status(200).json({
        status: "error",
        message: urlError,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

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
      fetchOptions.method = "POST";
      fetchOptions.headers = {
        "Content-Type": "text/plain;charset=utf-8",
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "SALEAD-Connector/2.0",
      };
      const payload: any = { action: action || "save" };
      if (data !== undefined) payload.data = data;
      if (fileName !== undefined) payload.fileName = fileName;
      if (base64Data !== undefined) payload.base64Data = base64Data;
      if (folderCategory !== undefined) payload.folderCategory = folderCategory;
      if (mimeType !== undefined) payload.mimeType = mimeType;
      if (lead !== undefined) payload.lead = lead;
      if (surveyResponse !== undefined) payload.surveyResponse = surveyResponse;

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
    const isHtml = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.includes("accounts.google.com");
    if (isHtml || response.status === 404) {
      if (trimmed.includes("accounts.google.com") || trimmed.includes("ServiceLogin") || trimmed.includes("Sign in")) {
        return res.status(200).json({
          status: "error",
          message: "O Google solicitou login. A implantação precisa estar configurada como 'Quem pode acessar: Qualquer pessoa' (Anyone) para conectar sem autenticação de tela. Acesse script.google.com > Implantar > Gerenciar implantações > Editar > Quem pode acessar: Qualquer pessoa.",
        });
      }
      if (trimmed.includes("Authorization is required") || trimmed.includes("Script function not found")) {
        return res.status(200).json({
          status: "error",
          message: "Autorização pendente no Google: Abra seu projeto no script.google.com, selecione a função 'doGet' no topo e clique em 'Executar' uma vez para conceder permissão ao Google Drive e Sheets.",
        });
      }
      if (response.status === 404 || trimmed.includes("404") || trimmed.includes("Not Found")) {
        return res.status(200).json({
          status: "error",
          message: "URL do Google Apps Script não encontrada (HTTP 404). Certifique-se de que a implantação existe no script.google.com, o tipo é 'App da Web', o acesso é 'Qualquer pessoa' e a URL termina em '/exec'.",
        });
      }
      return res.status(200).json({
        status: "error",
        message: "O Google Apps Script retornou uma página HTML em vez de JSON. Certifique-se de que a implantação é do tipo 'App da Web' com acesso para 'Qualquer pessoa' e a URL termina em '/exec'.",
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
