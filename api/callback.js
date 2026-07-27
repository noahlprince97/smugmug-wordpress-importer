export default async function handler(req, res) {
  res.status(200).json({
    message: "Callback reached successfully",
    query: req.query
  });
}
