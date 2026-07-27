import oauth from "../lib/smugmug.js";

export default function handler(req, res) {
  const { accessToken, accessSecret } = req.query;

  if (!accessToken || !accessSecret) {
    return res.status(400).json({
      error: "Missing accessToken or accessSecret",
    });
  }

  const url =
    "https://api.smugmug.com/api/v2/user/jsprince!albums";

  oauth.get(
    url,
    accessToken,
    accessSecret,
    function (err, data) {
      if (err) {
        console.error(err);

        return res.status(500).json(err);
      }

      res.setHeader("Content-Type", "application/json");
      res.status(200).send(data);
    }
  );
}
