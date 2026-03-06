<center align="center" style="text-align: center;justify-content:center;">
<div align="center" style="text-align: center;justify-content:center;">
<h1 align="center" style="text-align: center;justify-content:center;">

Timely MCP server
  
<img style="justify-content:center;text-align: center;width: 95px; height: auto;" width="793" height="411" alt="image" src="https://github.com/user-attachments/assets/abed1a04-d69b-4ab4-a490-d606064df72d" />
<img style="justify-content:center;text-align: center;width: 210px; height: auto;" width="756" height="206" alt="image" src="https://github.com/user-attachments/assets/f3aea4cc-1c05-4574-be39-0949b02eae70" />
  
</h1>

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)

</div>
</center>

MCP server for [Timely](https://timelyapp.com) time tracking API. Connects Claude Code (or any MCP client) to your Timely account for reading and creating time entries, projects, tasks, and users.

<img width="803" height="340" alt="image" src="https://github.com/user-attachments/assets/553167df-0758-49db-a899-d1f6c4b13679" />


## Features

- Read and create time entries with labels/tags
- Browse projects, users, and tasks
- Auto-refreshes expired OAuth tokens
- Auto-detects account ID during setup

## Tools

| Tool | Description |
|------|-------------|
| `timely_me` | Current user info |
| `timely_list_projects` / `timely_get_project` | Projects |
| `timely_list_users` / `timely_get_user` | People |
| `timely_list_events` / `timely_get_event` | Time entries (filterable by date, user, project) |
| `timely_create_event` / `timely_update_event` / `timely_delete_event` | Manage time entries |
| `timely_list_labels` / `timely_get_label` | Labels/tags |
| `timely_list_tasks` / `timely_get_task` | Tasks/forecasts |

## Setup

### 1. Create a Timely OAuth app

Go to `https://app.timelyapp.com/<your-account-id>/oauth_applications` and create a new app with redirect URI `https://localhost:7890/callback`.

### 2. Configure

```bash
cp .env.example .env
```

Add `TIMELY_CLIENT_ID` and `TIMELY_CLIENT_SECRET` from the OAuth app.

### 3. Authenticate

```bash
bun install
bun auth.ts
```

Open the URL in your browser and authorize. Tokens and account ID are saved automatically.

### 4. Add to Claude Code

```bash
claude mcp add timely --transport stdio --scope user \
  -- bun /path/to/timely-mcp-server/server.ts
```

### 5. Verify

In Claude Code, run `/mcp` and check that `timely` shows as connected.

## Token refresh

The server auto-refreshes expired access tokens. No manual re-auth needed unless the refresh token is revoked.

## Requirements

- [Bun](https://bun.sh) runtime
- Timely account with API access
