import { apiUrl, credentialsFromRequest, getAllPages, readJsonBody } from "../lib/api.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const credentials = credentialsFromRequest(req);
  const { nickname } = readJsonBody(req);

  if (!credentials || !nickname || !/^[A-Za-z0-9_-]+$/.test(nickname)) {
    return res.status(400).json({ error: "Missing or invalid SmugMug credentials" });
  }

  try {
    const albums = await getAllPages(
      apiUrl(`/api/v2/user/${encodeURIComponent(nickname)}!albums?count=100`),
      credentials.accessToken,
      credentials.accessSecret,
      ["Album", "Albums"]
    );

    res.status(200).json({
      galleries: albums.map((album) => ({
        id: album.AlbumKey || album.Uri,
        uri: album.Uri,
        title: album.Title || album.Name || "Untitled gallery",
        imageCount: Number(album.ImageCount || 0),
      })).filter((album) => album.uri),
    });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Unable to retrieve SmugMug galleries" });
  }
}
