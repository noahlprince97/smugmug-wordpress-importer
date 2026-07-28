# SmugMug WordPress Importer

This project has two parts:

- `api/` is a Vercel serverless API. It completes SmugMug OAuth and retrieves galleries and images.
- `wordpress-plugin/` is the WordPress plugin. Its Gutenberg sidebar connects to SmugMug, lists the connected user's galleries, and inserts every image in the chosen gallery into the current post. Each image is immediately followed by a blank paragraph block.

Images remain hosted by SmugMug; the plugin inserts their SmugMug URLs rather than copying image files to the WordPress media library.

## Deploy the API

1. Create a SmugMug API application and use this exact callback URL in its settings:
   `https://YOUR-VERCEL-DOMAIN/api/callback`
2. Deploy this repository to Vercel.
3. In the Vercel project environment variables, set:
   - `SMUGMUG_API_KEY`
   - `SMUGMUG_API_SECRET`
   - `SMUGMUG_CALLBACK_URL` — the same callback URL registered with SmugMug.
4. Redeploy after setting the variables. Visit `/api/health` on the deployed site to confirm the API is running.

## Install and use the WordPress plugin

1. Zip the contents of `wordpress-plugin/` and install that ZIP in WordPress through **Plugins → Add New → Upload Plugin**.
2. Go to **Settings → SmugMug Importer** and enter the Vercel deployment URL, without `/api` at the end.
3. Edit the WordPress post where the images should go. Open the **SmugMug** sidebar in the block editor.
4. Select **Connect to SmugMug**, complete the SmugMug authorization, choose a gallery, then select **Import gallery**.

The selected gallery is retrieved in full, including paginated results. The importer preserves the image order returned by SmugMug and adds one blank Gutenberg paragraph after every image.

## Security model

The OAuth popup posts its access token only to the WordPress origin that started the connection. WordPress saves the connection per user and makes server-to-server calls to the API, so gallery and image calls do not expose the access secret in browser requests.
