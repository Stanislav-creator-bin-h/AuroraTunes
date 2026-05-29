# AuroraTunes 1.2 (BETA)

## Швидкий старт

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
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python init_db.py
python main.py                  # http://127.0.0.1:5050
```

### 3. Frontend

```bash
cd Frontend
npm install
npm run dev                     # http://localhost:3000
```

У dev-режимі запити йдуть через проксі `/api` до backend на порту `5050`.

### 4. Electron (опційно)

```bash
cd Desktop
npm install
npm start
```

## Змінні середовища

| Файл | Опис |
| --- | --- |
| `Backend/.env` | `MSSQL_*`, `YOUTUBE_API_KEY`, `SOUNDCLOUD_CLIENT_ID`, `JWT_SECRET`, `FLASK_PORT` |
| `Frontend/.env.local` | `NEXT_PUBLIC_BACKEND_BASE_URL=http://127.0.0.1:5050` для static/Electron |

## Перевірка

- Backend: http://127.0.0.1:5050/health
- Frontend: http://127.0.0.1:3000
