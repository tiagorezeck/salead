import app from "../server";

export default function handler(req: any, res: any) {
  if (req.body !== undefined && req._body === undefined) {
    req._body = true;
  }
  return app(req, res);
}
