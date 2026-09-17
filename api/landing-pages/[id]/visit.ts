import type { VercelRequest, VercelResponse } from "@vercel/node";
import visitHandler from "../visit";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Encaminha para o manipulador unificado de visitas
  return visitHandler(req, res);
}
