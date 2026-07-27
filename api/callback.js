import axios from "axios";
import oauth from "../lib/oauth.js";
import { parse } from "cookie";

export default async function handler(req, res) {
  try {
    const cookies = parse(req.headers.cookie || "");

    const requestTokenSecret = cookies.smugmug_request_secret;

    if (!requestTokenSecret) {
      return res.status(400).json({
        error: "Missing request token secret."
      });
    }

    const { oauth_token, oauth_verifier } = req.query;

    const request = {
      url: "https://api.smugmug.com/services/oauth/1.0a/getAccessToken",
      method: "POST"
    };

    const auth = oauth.authorize(
      request,
      {
        key: oauth_token,
        secret: requestTokenSecret
      }
    );

    const response = await axios.post(
      request.url,
      null,
      {
        headers: {
          ...oauth.toHeader(auth)
        },
        params: {
          oauth_verifier
        }
      }
    );

    const params = new URLSearchParams(response.data);

    res.status(200).json({
      accessToken: params.get("oauth_token"),
      accessSecret: params.get("oauth_token_secret"),
      user: params.get("User"),
      nickname: params.get("NickName")
    });

  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      error: "Failed to exchange access token",
      details: err.response?.data || err.message
    });
  }
}
