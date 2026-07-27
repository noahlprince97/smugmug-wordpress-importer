import axios from "axios";
import oauth from "../lib/oauth.js";

export default async function handler(req, res) {
  try {
    const { oauth_token, oauth_verifier } = req.query;

    const request = {
      url: "https://api.smugmug.com/services/oauth/1.0a/getAccessToken",
      method: "POST",
      data: {
        oauth_token,
        oauth_verifier,
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

    res.status(200).json({
      accessToken: params.get("oauth_token"),
      accessSecret: params.get("oauth_token_secret"),
      user: params.get("User"),
      nickname: params.get("NickName"),
    });

  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      error: "Failed to exchange access token",
      details: err.response?.data || err.message,
    });
  }
}
