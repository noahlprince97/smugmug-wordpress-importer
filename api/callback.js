import { parse } from "cookie";
import oauth from "../lib/smugmug.js";

export default function handler(req, res) {
  const { oauth_token, oauth_verifier } = req.query;

  const cookies = parse(req.headers.cookie || "");
  const requestSecret = cookies.smugmug_secret;
  const origin = cookies.smugmug_origin;

  if (!oauth_token || !oauth_verifier || !requestSecret || !origin) {
    return res.status(400).send("The SmugMug sign-in session has expired. Please close this window and try again.");
  }

  oauth.getOAuthAccessToken(
    oauth_token,
    requestSecret,
    oauth_verifier,
    function (err, accessToken, accessSecret, results) {
      if (err) {
        console.error(err);
        return res.status(500).send("SmugMug sign-in could not be completed. Please close this window and try again.");
      }

      const message = JSON.stringify({
        type: "smugmug-auth",
        accessToken,
        accessSecret,
        user: results?.User,
        nickname: results?.NickName || results?.User?.NickName,
      }).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
      const targetOrigin = JSON.stringify(origin);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'");
      res.setHeader("Set-Cookie", [
        "smugmug_secret=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        "smugmug_origin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      ]);
      res.status(200).send(`<!doctype html><title>SmugMug connected</title><style>body{font:16px system-ui;padding:2rem}</style><p>SmugMug connected. This window will close automatically.</p><script>const message=${message};const targetOrigin=${targetOrigin};if(window.opener){window.opener.postMessage(message,targetOrigin);window.close();}</script>`);
    }
  );
}
