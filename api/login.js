import oauth from "../lib/smugmug.js";

export default function handler(req, res) {
  oauth.getOAuthRequestToken(
    function (err, oauthToken, oauthTokenSecret) {
      if (err) {
        console.error(err);

        return res.status(500).json({
          error: "Failed to obtain request token",
          details: err,
        });
      }

      res.setHeader(
        "Set-Cookie",
        `smugmug_secret=${oauthTokenSecret}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
      );

      res.redirect(
        `https://api.smugmug.com/services/oauth/authorize?oauth_token=${oauthToken}`
      );
    }
  );
}
