/**
 * Cloudflare Worker — GitHub OAuth proxy for Decap CMS
 *
 * Deploy this as a Cloudflare Worker, then set these secrets:
 *   wrangler secret put GITHUB_CLIENT_ID
 *   wrangler secret put GITHUB_CLIENT_SECRET
 *
 * Set the Worker URL as `base_url` in static/admin/config.yml
 *
 * GitHub OAuth App settings:
 *   Homepage URL:             https://your-site.pages.dev
 *   Authorization callback:   https://aog-oauth.YOUR-SUBDOMAIN.workers.dev/callback
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // GET /auth  — redirect to GitHub OAuth authorization page
    if (url.pathname === "/auth") {
      const scope = url.searchParams.get("scope") || "repo,user";
      const githubAuthURL =
        `https://github.com/login/oauth/authorize` +
        `?client_id=${env.GITHUB_CLIENT_ID}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&redirect_uri=${encodeURIComponent(new URL("/callback", url.origin).href)}`;
      return Response.redirect(githubAuthURL, 302);
    }

    // GET /callback  — exchange code for token, post message back to CMS
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");

      if (!code) {
        return new Response("Missing OAuth code", { status: 400 });
      }

      // Exchange the code for an access token
      const tokenRes = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        }
      );

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(
          `OAuth error: ${tokenData.error_description || tokenData.error}`,
          { status: 400 }
        );
      }

      const token = tokenData.access_token;

      // Send token back to the Decap CMS window via postMessage
      const html = `<!DOCTYPE html>
<html>
<head><title>AOG Admin — Authorizing...</title></head>
<body>
<p>Authorizing, please wait...</p>
<script>
  (function () {
    function sendToken() {
      var msg = JSON.stringify({
        token: "${token}",
        provider: "github"
      });
      // Decap CMS listens for this exact message format.
      // Target must be "*" — opener is on a different domain (the Pages site)
      window.opener.postMessage(
        "authorization:github:success:" + msg,
        "*"
      );
    }
    window.opener.postMessage("authorizing:github", "*");
    // Small delay then send token
    setTimeout(sendToken, 100);
  })();
</script>
</body>
</html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html", ...CORS_HEADERS },
      });
    }

    return new Response("AOG OAuth Proxy — path not found", { status: 404 });
  },
};
