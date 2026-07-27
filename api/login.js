import axios from "axios";
import oauth from "../lib/oauth.js";

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

    const response = await axios.post(
      request.url,
      null,
      {
        headers: {
          ...oauth.toHeader(auth),
        },
      }
    );

    const params = new URLSearchParams(response.data);

    const token = params.get("oauth_token");

    if (!token) {
      throw new Error("No request token returned by SmugMug.");
    }

    res.redirect(
      `https://api.smugmug.com/services/oauth/1.0a/authorize?oauth_token=${token}`
    );
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      error: "Failed to obtain SmugMug request token",
      details: err.response?.data || err.message,
    });
  }
}
