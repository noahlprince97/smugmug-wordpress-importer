import oauth from "./smugmug.js";

const API_ROOT = "https://api.smugmug.com";

export function credentialsFromRequest(req) {
  const body = readJsonBody(req);
  let accessToken = req.headers["x-smugmug-access-token"] || body.accessToken;
  let accessSecret = req.headers["x-smugmug-access-secret"] || body.accessSecret;

  // WordPress.com can remove custom headers and JSON bodies from server-to-server
  // requests. Accept standard HTTP Basic authentication as a reliable fallback.
  if ((!accessToken || !accessSecret) && typeof req.headers.authorization === "string") {
    const match = req.headers.authorization.match(/^Basic\s+(.+)$/i);
    if (match) {
      try {
        const separator = Buffer.from(match[1], "base64").toString("utf8").indexOf(":");
        const decoded = Buffer.from(match[1], "base64").toString("utf8");
        if (separator > 0) {
          accessToken = decoded.slice(0, separator);
          accessSecret = decoded.slice(separator + 1);
        }
      } catch {
        // Fall through to the normal missing-credentials response.
      }
    }
  }

  if (!accessToken || !accessSecret) {
    return null;
  }

  return { accessToken, accessSecret };
}

export function readJsonBody(req) {
  if (!req.body) {
    return {};
  }

  const body = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return body;
}

export function smugMugGet(url, accessToken, accessSecret) {
  // The node OAuth client cannot attach per-request headers to OAuth 1.0 GET
  // calls. SmugMug provides _accept as an official URL-based alternative to
  // its Accept header, so request JSON explicitly and avoid the HTML API UI.
  const jsonUrl = new URL(url);
  jsonUrl.searchParams.set("_accept", "application/json");

  return new Promise((resolve, reject) => {
    oauth.get(
      jsonUrl.toString(),
      accessToken,
      accessSecret,
      (error, data) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          resolve(typeof data === "string" ? JSON.parse(data) : data);
        } catch (parseError) {
          reject(parseError);
        }
      }
    );
  });
}

function valuesFromResponse(payload, keys) {
  for (const source of [payload, payload?.Response]) {
    if (!source) {
      continue;
    }

    for (const key of keys) {
      if (Array.isArray(source[key])) {
        return source[key];
      }
    }
  }

  return [];
}

function nextPageFromResponse(payload) {
  for (const source of [payload, payload?.Response]) {
    const pages = source?.Pages;
    const next = pages?.NextPage || pages?.Next || source?.NextPage;

    if (typeof next === "string") {
      return next;
    }

    if (next?.Uri) {
      return next.Uri;
    }
  }

  return null;
}

export async function getAllPages(url, accessToken, accessSecret, keys) {
  const items = [];
  let nextUrl = url;
  let pageCount = 0;

  while (nextUrl && pageCount < 100) {
    const payload = await smugMugGet(nextUrl, accessToken, accessSecret);
    items.push(...valuesFromResponse(payload, keys));

    const next = nextPageFromResponse(payload);
    nextUrl = next ? (next.startsWith("http") ? next : `${API_ROOT}${next}`) : null;
    pageCount += 1;
  }

  return items;
}

export function apiUrl(path) {
  return `${API_ROOT}${path}`;
}
