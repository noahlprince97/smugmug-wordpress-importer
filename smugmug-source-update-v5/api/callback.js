import { parse } from "cookie";
import oauth from "../lib/smugmug.js";

export default function handler(req, res) {
  const { oauth_token, oauth_verifier } = req.query;

  const cookies = parse(req.headers.cookie || "");
  const requestSecret = cookies.smugmug_secret;
  const origin = cookies.smugmug_origin;
  const returnUrl = cookies.smugmug_return_url;
  const state = cookies.smugmug_state;

  if (!oauth_token || !oauth_verifier || !requestSecret || !origin || !returnUrl || !state) {
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
      const escapeHtml = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
      const form = `<form id="complete-connection" method="post" action="${escapeHtml(returnUrl)}"><input type="hidden" name="state" value="${escapeHtml(state)}"><input type="hidden" name="accessToken" value="${escapeHtml(accessToken)}"><input type="hidden" name="accessSecret" value="${escapeHtml(accessSecret)}"><input type="hidden" name="nickname" value="${escapeHtml(results?.NickName || results?.User?.NickName)}"></form>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'");
      res.setHeader("Set-Cookie", [
        "smugmug_secret=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        "smugmug_origin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        "smugmug_return_url=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        "smugmug_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      ]);
      res.status(200).send(`<!doctype html><title>SmugMug connected</title><style>body{font:16px system-ui;padding:2rem}</style><p>SmugMug connected. Returning to WordPress…</p>${form}<script>const message=${message};const targetOrigin=${targetOrigin};if(window.opener){window.opener.postMessage(message,targetOrigin);window.close();}else{document.getElementById('complete-connection').submit();}</script>`);
    }
  );
}
