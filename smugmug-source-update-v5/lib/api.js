import oauth from "./smugmug.js";

const API_ROOT = "https://api.smugmug.com";

export function credentialsFromRequest(req) {
  const body = readJsonBody(req);
  const accessToken = req.headers["x-smugmug-access-token"] || body.accessToken;
  const accessSecret = req.headers["x-smugmug-access-secret"] || body.accessSecret;

  if (!accessToken || !accessSecret) {
    return null;
  }

  return { accessToken, accessSecret };
}

export function readJsonBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

export function smugMugGet(url, accessToken, accessSecret) {
  return new Promise((resolve, reject) => {
    oauth.get(
      url,
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
      },
      { Accept: "application/json" }
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
