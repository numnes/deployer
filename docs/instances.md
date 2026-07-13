# Instances & lifetime

## What you get

Ephemeral **preview URLs** for code review and QA before merge:

- **One URL per branch / PR** — e.g. `https://preview.example.com/feature-xyz/`
- **Environment queue** — when the active slot limit is reached, new deploys stay `waiting` until a preview is paused or destroyed
- **Pause / resume / redeploy** — per instance in the dashboard, or **Restart all instances** on a project
- **Teardown on PR close** — optional workflow removes the instance automatically
- **Bulk teardown** — **Projects → Settings → Teardown all instances** pauses every active instance for a project
- **Delete project** — removes the project and destroys all its instances (PM2, nginx, database); checkout directory is removed from disk
- **Instance lifetime** — optional per-project limits to auto-pause (active time) or auto-remove (total existence); see below
- **Multi-machine dashboard** — connect other deployer hosts and manage them from one panel; see [Cluster](cluster.md)

## Instance lifetime

In **Projects → Settings**, you can set optional limits per project:

| Limit                                     | Effect                                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Max active lifetime** (days / hours)    | While `active`, counts down; when it expires the instance is **paused** (runtime stopped, record kept)          |
| **Max existence lifetime** (days / hours) | From creation; when it expires the instance is **destroyed** (PM2/Docker + nginx + DB record; checkout removed) |

The scheduler runs every minute. The **Instances** list and instance detail page show `activeExpiresAt` and `existenceExpiresAt` when limits apply.

## Instance states

Preview / ephemeral environment lifecycle:

| Status      | Meaning                                              |
| ----------- | ---------------------------------------------------- |
| `active`    | Running on the host (PM2 + nginx) — live review app  |
| `waiting`   | Registered, waiting for a free slot (queued preview) |
| `deploying` | Deploy job in progress                               |
| `paused`    | Stopped on the host, still in the database           |
| `error`     | Last deploy or activate failed                       |

[← Back to README](../README.md)
