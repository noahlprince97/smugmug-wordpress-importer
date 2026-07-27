import oauth from "../lib/smugmug.js";

export default function handler(req, res) {
  const { accessToken, accessSecret } = req.query;

  if (!accessToken || !accessSecret) {
    return res.status(400).json({
      error: "Missing accessToken or accessSecret",
    });
  }

  const url = "https://api.smugmug.com/api/v2!authuser?_verbosity=1";

  oauth.get(
    url,
    accessToken,
    accessSecret,
    function (err, data, response) {
      if (err) {
        console.error("OAuth Error:");
        console.error(err);

        return res.status(500).json({
          error: err,
        });
      }

      console.log("Status:", response?.statusCode);
      console.log("Headers:", response?.headers);
      console.log("Body:");
      console.log(data);

      res.status(200).send(data);
    }
  );
}
