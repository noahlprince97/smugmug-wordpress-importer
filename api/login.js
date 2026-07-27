import axios from "axios";
import oauth from "../lib/oauth.js";
import { serialize } from "cookie";

export default async function handler(req, res) {
  try {
    const callback =
      "https://smugmug-wordpress-tool.vercel.app/api/callback";

    const request = {
      url: "https://api.smugmug.com/services/oauth/1.0a/getRequestToken",
      method: "POST",
      data: {
        oauth_callback: callback,
      },
    };

    const auth = oauth.authorize(request);

    const response = await axios.post(request.url, null, {
      headers: {
        ...oauth.toHeader(auth),
      },
    });

    const params = new URLSearchParams(response.data);

    const requestToken = params.get("oauth_token");
    const requestTokenSecret = params.get("oauth_token_secret");

    if (!requestToken || !requestTokenSecret) {
      throw new Error("Missing request token or secret.");
    }

    res.setHeader(
      "Set-Cookie",
      serialize("smugmug_request_secret", requestTokenSecret, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      })
    );

    res.redirect(
      `https://api.smugmug.com/services/oauth/1.0a/authorize?oauth_token=${requestToken}`
    );
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      error: "Failed to obtain SmugMug request token",
      details: err.response?.data || err.message,
    });
  }
}
