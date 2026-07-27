export default function handler(req, res) {
  const apiKey = process.env.SMUGMUG_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "SMUGMUG_API_KEY is not configured"
    });
  }

  const callback =
    "https://smugmug-wordpress-importer-9rgy.vercel.app/api/callback";

  const url =
    "https://api.smugmug.com/services/oauth/authorize" +
    "?Access=Full" +
    "&Permissions=Read" +
    "&APIKey=" + encodeURIComponent(apiKey) +
    "&Callback=" + encodeURIComponent(callback);

  res.writeHead(302, {
    Location: url
  });

  res.end();
}
