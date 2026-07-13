# Configure nginx

Preview URLs are served by **nginx on the deployer host**. The core writes one `*.location` file per instance under the locations directory (default `~/deployer/locations`). Each file is named `{project-slug}-{branch-slug}.location` and proxies `/{project-slug}-{branch-slug}/` to the instance's local port. Including the project slug in the path avoids collisions between different projects that share a branch name.

**You need a separate nginx `server` block (or equivalent site config) for every domain or subdomain used as a project's public URL.** If two projects use different hosts — e.g. `preview.app-a.example.com` and `preview.app-b.example.com` — configure nginx for **each** host and point the matching **Public URL** in the dashboard to that host.

## Per domain / subdomain

1. **Pick the hostname** for the project (e.g. `preview.myapp.example.com`).
2. **Add or update a site** in nginx (`sites-available` / `sites-enabled`, or your distro's layout).
3. **Include deployer locations** inside the `server { }` block for that hostname:

   ```nginx
   include /home/you/deployer/locations/*.location;
   ```

   Or use the helper (read-only — prints the full file for you to paste):

   ```bash
   deployer setup nginx
   deployer setup nginx -f /etc/nginx/sites-enabled/mysite.conf   # skip picker
   deployer setup nginx -s /etc/nginx/sites-available             # custom directory
   ```

   It lists configs in `sites-enabled` (or the directory you pass), shows the file with the `include` line added, and tells you to replace the file contents manually (e.g. `sudo nano …`), then run `sudo nginx -t && sudo nginx -s reload`.

4. In the dashboard, set the project **Public URL** to that host (e.g. `https://preview.myapp.example.com`). Branch previews are at `{Public URL}/{project-slug}-{branch-slug}/`.

5. After deploys, the core reloads nginx when location files change. After **editing site configs by hand**, test and reload:

   ```bash
   sudo nginx -t && sudo nginx -s reload
   ```

Verify from the dashboard: **Setup → Nginx** (directory, `nginx -t`, process check).

[← Back to README](../README.md)
