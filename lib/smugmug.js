import { OAuth } from "oauth";

const callback =
  "https://smugmug-wordpress-tool.vercel.app/api/callback";

const oauth = new OAuth(
  "https://api.smugmug.com/services/oauth/1.0a/getRequestToken",
  "https://api.smugmug.com/services/oauth/1.0a/getAccessToken",
  process.env.SMUGMUG_API_KEY,
  process.env.SMUGMUG_API_SECRET,
  "1.0",
  callback,
  "HMAC-SHA1"
);

export default oauth;
