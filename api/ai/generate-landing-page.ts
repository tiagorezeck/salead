import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateAdaptiveLandingPage } from "../../src/components/marketing/comet-lp/utils/adaptiveGenerator";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Utilize POST." });
  }

  try {
    const { prompt, niche, cityOrRegion, targetAudience, offerDetails, accentColor, theme, heroModel } = req.body || {};

    const pageData = generateAdaptiveLandingPage({
      prompt,
      niche,
      cityOrRegion,
      targetAudience,
      offerDetails,
      accentColor,
      theme,
      heroModel,
    });

    return res.status(200).json({
      success: true,
      data: pageData,
      source: "adaptive_cro_engine",
    });
  } catch (err: any) {
    console.error("Erro na rota serverless de geração de landing page:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Erro ao processar geração de página",
    });
  }
}
