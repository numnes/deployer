# Deployer

Deployer é uma ferramenta para criar e gerenciar **preview environments por branch**: cada branch de um projeto pode virar uma instância isolada (porta + processo PM2 + route no nginx), com fila e limite global de instâncias ativas.

## Como funciona (visão geral)

- **Core (`core/`)**: scripts Bash que fazem o trabalho “no host”:
  - clonar/atualizar repo da branch
  - build/start com PM2
  - criar/remover `location` do nginx (path `/{branchSlug}/`)
  - pausar (derruba PM2/nginx mantendo checkout) e destruir (remove tudo)
- **API (`server/`)**: NestJS + Postgres + BullMQ/Redis
  - persiste projetos, instâncias, eventos e configurações
  - aplica o limite global de instâncias ativas e mantém fila `waiting`
  - processa jobs de deploy/destroy em background
- **Front (`front/`)**: Next.js (dashboard e telas de administração)

### Estados de instância

Uma instância (branch) pode estar em:

- **`active`**: levantada (registrada no banco e com processo no PM2)
- **`waiting`**: registrada, mas aguardando vaga no limite global
- **`deploying`**: em deploy (job em execução)
- **`paused`**: derrubada no host, mas mantida no banco (pode ser reativada)
- **`error`**: falha ao deployar/reativar

## Fluxos principais

### Deploy (com fila)

1. Um deploy é requisitado (endpoint com API key).
2. A API verifica o limite `max_active_instances` (em `settings`).
3. Se houver vaga: marca `deploying` e roda o core `deploy.sh`; ao final marca `active`.
4. Se não houver vaga: cria/atualiza a instância como `waiting` **sem** rodar shell.
5. Quando uma vaga é liberada (pause/remove), a fila `waiting` é processada e a próxima sobe.

### Pausar / Ativar / Remover

- **Pausar**: derruba PM2/nginx e mantém o registro (`paused`).
- **Ativar / redeploy**: sobe instâncias `waiting/paused/error` quando possível; se já está `active`, força um redeploy.
- **Remover**: executa destroy no host e remove o registro do banco (libera vaga imediatamente).

## Endpoints (resumo)

- **Auth**: login/registro (JWT)
- **Deploy**:
  - `POST /deploy` (API key)
  - `POST /deploy/destroy` (API key)
- **Dashboard**:
  - `GET /dashboard/summary` (JWT)
- **Instâncias**:
  - `GET /instances` (JWT)
  - `GET /instances/:id` (JWT)
  - `GET /instances/:id/logs` (JWT)
  - `POST /instances/:id/pause` (JWT)
  - `POST /instances/:id/activate` (JWT)
  - `POST /instances/:id/remove` (JWT)
- **Configurações globais**:
  - `GET /settings` (JWT)
  - `PATCH /settings` (JWT)

## Ambiente local (Docker + PM2)

Este repositório pode ser iniciado localmente com:

- Postgres + Redis no Docker
- Front (Next.js) no Docker
- API (NestJS) no PM2 (no host)

### Pré-requisitos

- Docker (com `docker compose`)
- Node.js 22+
- `pnpm` e `pm2` instalados globalmente:

```bash
npm i -g pnpm pm2
```

### Subir tudo

1) Ajuste o `server/.env` (se necessário). Por padrão ele já aponta para:

- `DATABASE_URL=postgresql://postgres:deployer@localhost:5432/deployer`
- `REDIS_HOST=localhost`
- `REDIS_PORT=6480`
- `TYPEORM_SYNC=true`

2) Rode:

```bash
./scripts/dev-up.sh
```

Endpoints:

- API: `http://localhost:3000`
- Front: `http://localhost:3001`

### Derrubar tudo

```bash
./scripts/dev-down.sh
```

## Variáveis de ambiente (API)

Arquivo: `server/.env`

- **`DATABASE_URL`**: conexão Postgres (ex.: `postgresql://postgres:deployer@localhost:5432/deployer`)
- **`REDIS_HOST`** / **`REDIS_PORT`**: Redis (BullMQ)
- **`PORT`**: porta da API (padrão `3000`)
- **`JWT_SECRET`**: segredo para assinar tokens
- **`TYPEORM_SYNC`**: `true` para sincronizar schema automaticamente (dev)
- **`DEPLOYER_WORK_ROOT`**: diretório onde ficam checkouts/builds das branches
- **`DEPLOYER_CORE_DIR`**: caminho para `core/`
- **`CORS_ORIGIN`**: origens permitidas (ex.: `http://localhost:3001`)

## Nginx (host)

O core escreve arquivos `*.location` em `DEPLOYER_LOCATIONS_DIR` (por padrão `~/deployer/locations`) e faz reload do nginx.
Use `core/bin/setup-nginx.sh <domínio>` para gerar um snippet do `server {}` com `include .../*.location`.

