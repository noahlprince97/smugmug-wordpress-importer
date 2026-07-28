import oauth from "../lib/smugmug.js";

export default function handler(req, res) {
  let origin;
  let returnUrl;
  const state = String(req.query.state || "");

  try {
    origin = new URL(String(req.query.origin || "")).origin;
    returnUrl = new URL(String(req.query.returnUrl || ""));
  } catch {
    return res.status(400).json({ error: "A valid WordPress origin is required" });
  }

  if (returnUrl.origin !== origin || !/^[A-Za-z0-9]+$/.test(state)) {
    return res.status(400).json({ error: "A valid WordPress return address is required" });
  }

  oauth.getOAuthRequestToken(
    function (err, oauthToken, oauthTokenSecret) {
      if (err) {
        console.error(err);

        return res.status(500).json({
          error: "Failed to obtain request token",
          details: err,
        });
      }

      res.setHeader("Set-Cookie", [
        `smugmug_secret=${encodeURIComponent(oauthTokenSecret)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
        `smugmug_origin=${encodeURIComponent(origin)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
        `smugmug_return_url=${encodeURIComponent(returnUrl.toString())}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
        `smugmug_state=${encodeURIComponent(state)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      ]);

      res.redirect(
        `https://api.smugmug.com/services/oauth/authorize?oauth_token=${encodeURIComponent(oauthToken)}`
      );
    }
  );
}
