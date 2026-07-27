import { parse } from "cookie";
import oauth from "../lib/smugmug.js";

export default function handler(req, res) {
  const { oauth_token, oauth_verifier } = req.query;

  const cookies = parse(req.headers.cookie || "");
  const requestSecret = cookies.smugmug_secret;

  if (!requestSecret) {
    return res.status(400).json({
      error: "Missing request token secret",
    });
  }

  oauth.getOAuthAccessToken(
    oauth_token,
    requestSecret,
    oauth_verifier,
    function (err, accessToken, accessSecret, results) {
      if (err) {
        console.error(err);

        return res.status(500).json({
          error: "Failed to exchange access token",
          details: err,
        });
      }

      res.status(200).json({
        accessToken,
        accessSecret,
        user: results?.User,
        nickname: results?.NickName,
      });
    }
  );
}
