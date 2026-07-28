import { apiUrl, credentialsFromRequest, getAllPages, readJsonBody, smugMugGet } from "../lib/api.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const credentials = credentialsFromRequest(req);
  let { nickname } = readJsonBody(req);

  if (!credentials) {
    return res.status(400).json({ error: "Missing or invalid SmugMug credentials" });
  }

  try {
    if (!nickname || !/^[A-Za-z0-9_-]+$/.test(nickname)) {
      const authUserResponse = await smugMugGet(
        apiUrl("/api/v2!authuser"),
        credentials.accessToken,
        credentials.accessSecret
      );
      const authUser = authUserResponse?.Response?.User || authUserResponse?.User;
      nickname = authUser?.NickName;
    }

    if (!nickname || !/^[A-Za-z0-9_-]+$/.test(nickname)) {
      return res.status(502).json({ error: "Unable to identify the connected SmugMug account" });
    }

    const albums = await getAllPages(
      apiUrl(`/api/v2/user/${encodeURIComponent(nickname)}!albums?count=100`),
      credentials.accessToken,
      credentials.accessSecret,
      ["Album", "Albums"]
    );

    res.status(200).json({
      nickname,
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
