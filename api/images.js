import { apiUrl, credentialsFromRequest, getAllPages, readJsonBody } from "../lib/api.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const credentials = credentialsFromRequest(req);
  const { albumUri } = readJsonBody(req);

  if (!credentials || typeof albumUri !== "string" || !/^\/api\/v2\/album\/[^/?]+$/.test(albumUri)) {
    return res.status(400).json({ error: "Missing or invalid album" });
  }

  try {
    const albumImages = await getAllPages(
      apiUrl(`${albumUri}!images?count=100`),
      credentials.accessToken,
      credentials.accessSecret,
      ["AlbumImage", "Images"]
    );
    const images = albumImages.map((image) => ({
      url: image.ImageUrl || image.OriginalUrl,
      title: image.Title || image.FileName || "",
      caption: image.Caption || "",
      filename: image.FileName || "",
    })).filter((image) => image.url);

    res.status(200).json({ images });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Unable to retrieve SmugMug images" });
  }
}
