import type { VercelRequest, VercelResponse } from "@vercel/node";
import previewHandler from "../preview";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawId = req.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (id && !req.query.pageId && !req.query.token) {
    req.query.pageId = id;
    req.query.token = id;
  }
  return previewHandler(req, res);
}
