# AuroraTunes 1.2 (BETA)

## Швидкий старт (для нового розробника)

### 1. SQL Server (Docker)

```bash
docker run -d --name auroratunes-mssql \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_PID=Developer" \
  -e "MSSQL_SA_PASSWORD=ChangeMe_StrongPassword_123!@#" \
  -p 1433:1433 \
  -v auroratunes-mssql-data:/var/opt/mssql \
  --restart unless-stopped \
  mcr.microsoft.com/mssql/server:2022-latest
```

### 2. Backend

```bash
cd Backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # відредагуйте ключі API
python init_db.py               # створить БД і таблиці
python main.py                  # http://127.0.0.1:5000
```

### 3. Frontend

```bash
cd Frontend
npm install
npm run dev                     # http://localhost:3000
```

У dev-режимі запити йдуть через проксі `/api` → backend (див. `next.config.mjs`).

### 4. Electron (опційно)

```bash
cd Desktop
npm install
npm start
```

## Змінні середовища

| Файл | Опис |
|------|------|
| `Backend/.env` | `MSSQL_*`, `YOUTUBE_API_KEY`, `SOUNDCLOUD_CLIENT_ID`, `JWT_SECRET` |
| `Frontend/.env.local` | `NEXT_PUBLIC_BACKEND_BASE_URL=http://127.0.0.1:5000` (лише для static/Electron) |

## Перевірка

- Backend: http://127.0.0.1:5000/health
- Frontend: головна → плейлист скролиться вниз і підвантажує треки
