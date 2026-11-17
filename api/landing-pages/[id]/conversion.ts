import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const rawId = req.query.id;
  const id = String(Array.isArray(rawId) ? rawId[0] : rawId || "").trim();

  return res.status(200).json({
    status: "success",
    success: true,
    id,
    message: "Conversão registrada",
  });
}
