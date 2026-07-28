const DEFAULT_WORDPRESS_ORIGIN = "https://longitudeandgratitude.blog";

export function allowWordPressEditor(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin = process.env.WORDPRESS_ORIGIN || DEFAULT_WORDPRESS_ORIGIN;

  if (origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false;
}
