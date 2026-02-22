# Как поднять фронт и бэкенд вместе

На ветке `main` в репозитории только бэкенд, фронт у тебя в этой папке (ветка `master`). Чтобы всё работало вместе:

## 1. Бэкенд (ветка main)

В **отдельной папке** клонируй репо и переключись на `main`:

```powershell
cd C:\Users\nurgu\OneDrive\Desktop
git clone https://github.com/bagilaaa/fire.git fire-backend
cd fire-backend
git checkout main
```

Подними бэкенд (порт **8000**):

```powershell
# Вариант с Docker (если есть docker-compose)
docker-compose up -d

# Или через Python (создай .env из .env.example и установи зависимости)
# pip install -r requirements.txt
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Убедись, что API доступен: открыть в браузере или curl `http://localhost:8000/docs` (если FastAPI).

## 2. Фронт (эта папка)

В папке **Corporate Web Interface Design** (ветка master):

```powershell
cd "C:\Users\nurgu\OneDrive\Desktop\Corporate Web Interface Design"
npm run dev
```

Фронт будет на `http://localhost:5173`. Запросы к `/tickets`, `/managers`, `/upload`, `/ai` через **прокси в Vite** уйдут на `http://localhost:8000` — отдельный `.env` для разработки не нужен.

## 3. Если бэкенд на другом порту

Отредактируй в **vite.config.ts** в `server.proxy`: замени `8000` на нужный порт.

## Итого

| Что      | Папка                    | Команда / URL              |
|----------|--------------------------|----------------------------|
| Бэкенд   | `fire-backend` (main)    | `docker-compose up` или uvicorn, порт 8000 |
| Фронт    | Corporate Web Interface Design (master) | `npm run dev`, порт 5173   |

Сначала запусти бэкенд, потом фронт.
