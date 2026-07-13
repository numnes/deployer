# CLI reference

## Stack commands

| Command                            | Description                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `deployer setup`                   | Start Postgres, Redis, web (Docker) and API (PM2); creates/updates `api/.env` |
| `deployer up`, `deployer start`    | Same as `deployer setup`                                                      |
| `deployer down`, `deployer stop`   | Stop API and containers (asks for confirmation)                               |
| `deployer restart`                 | `down` then `setup` (asks for confirmation)                                   |
| `deployer status`                  | Show ports, Docker containers, and PM2 API process                            |
| `deployer logs api`                | Follow API logs (PM2)                                                         |
| `deployer logs web`                | Follow web container logs                                                     |
| `deployer update`, `deployer pull` | `git pull` in the install dir + refresh CLI symlink                           |
| `deployer root`, `deployer path`   | Print install directory                                                       |
| `deployer help`                    | Show command summary                                                          |

Options for `down` / `restart`: `-y`, `--yes`, or `DEPLOYER_YES=1` to skip confirmation.

## Project commands

| Command                        | Description                                                                |
| ------------------------------ | -------------------------------------------------------------------------- |
| `deployer project init`        | Copy workflows + `deployer.yaml` into an app repo; print registration JSON |
| `deployer project init --help` | Options: `PATH`, `-f`/`--force`, `--branches`                              |

## nginx helper

| Command                       | Description                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `deployer setup nginx`        | List `sites-enabled`, print config with `include …/*.location;` (manual paste) |
| `deployer setup nginx --help` | Options: `-f`/`--file`, `-s`/`--sites-dir`                                     |

## Examples

```bash
deployer setup
deployer status
deployer logs api
deployer project init
deployer project init ../my-app --branches main,develop --force
deployer setup nginx
deployer setup nginx -f /etc/nginx/sites-enabled/preview.example.com
deployer update
```

## Install & runtime env vars

| Variable                      | Purpose                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `DEPLOYER_INSTALL_DIR`        | Clone destination for `install.sh` (default `~/deployer`)                |
| `DEPLOYER_REPO_URL`           | Git URL for `install.sh`                                                 |
| `DEPLOYER_BIN_DIR`            | Where to link the `deployer` executable (default `~/.local/bin`)         |
| `DEPLOYER_ROOT`               | Override install directory for the CLI                                   |
| `DEPLOYER_YES`                | Skip confirmation on `down` / `restart`                                  |
| `DEPLOYER_PROJECT_SLUG`       | Non-interactive slug for `project init`                                  |
| `DEPLOYER_PROJECT_GIT_URL`    | Non-interactive git URL for `project init`                               |
| `DEPLOYER_PROJECT_SERVER_URL` | Optional Public URL for `project init`                                   |
| `NGINX_SITES_ENABLED`         | Default directory for `setup nginx` (default `/etc/nginx/sites-enabled`) |

[← Back to README](../README.md)
