import { apiUrl, credentialsFromRequest, getAllPages, readJsonBody, smugMugGet } from "../lib/api.js";
import { allowWordPressEditor } from "../lib/cors.js";

function imageSizesFromResponse(payload) {
  const candidates = [
    payload?.Response?.ImageSizes,
    payload?.ImageSizes,
    payload?.Response?.ImageSizeDetails?.ImageSizes,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (candidate && typeof candidate === "object") {
      return Object.values(candidate).filter((size) => size && typeof size === "object");
    }
  }

  return [];
}

async function importableImage(image, accessToken, accessSecret) {
  let url = image.ImageUrl || image.OriginalUrl || image.Url;

  if (!url) {
    const sizeDetailsUri = image?.Uris?.ImageSizeDetails?.Uri;
    if (typeof sizeDetailsUri === "string") {
      const details = await smugMugGet(apiUrl(sizeDetailsUri), accessToken, accessSecret);
      const sizes = imageSizesFromResponse(details).filter((size) => typeof size.Url === "string");
      // Prefer the largest available display size so Gutenberg receives a high-quality image.
      sizes.sort((left, right) => Number(right.Width || 0) - Number(left.Width || 0));
      url = sizes[0]?.Url;
    }
  }

  return {
    url,
    title: image.Title || image.FileName || "",
    caption: image.Caption || "",
    filename: image.FileName || "",
  };
}

export default async function handler(req, res) {
  if (allowWordPressEditor(req, res)) {
    return;
  }

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
    const images = await Promise.all(albumImages.map(async (image) => {
      try {
        return await importableImage(image, credentials.accessToken, credentials.accessSecret);
      } catch (error) {
        console.warn("Unable to retrieve an image URL", error);
        return null;
      }
    }));

    res.status(200).json({ images: images.filter((image) => image?.url) });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Unable to retrieve SmugMug images" });
  }
}
