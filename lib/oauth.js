import OAuth from "oauth-1.0a";
import CryptoJS from "crypto-js";

const oauth = new OAuth({
  consumer: {
    key: process.env.SMUGMUG_API_KEY,
    secret: process.env.SMUGMUG_API_SECRET,
  },
  signature_method: "HMAC-SHA1",
  hash_function(baseString, key) {
    return CryptoJS.HmacSHA1(baseString, key).toString(CryptoJS.enc.Base64);
  },
});

export default oauth;
