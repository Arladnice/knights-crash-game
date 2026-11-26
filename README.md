# Knight's Crash Game

3D real-time краш-игра со средневековым рыцарем и драконом в подземелье: мультиплеер на WebSocket (`Socket.IO`), процедурная 3D-сцена на **React Three Fiber** и **Three.js**, пост-обработка и локальный **Demo Mode** для мгновенной работы без бэкенда.

🔗 **[Демо (GitHub Pages)](https://arladnice.github.io/knights-crash-game/)** · 💻 **[GitHub](https://github.com/Arladnice/knights-crash-game)**

## Стек технологий

| Слой | Технологии |
|---|---|
| 3D / WebGL | `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `Three.js` |
| Frontend | `React 19`, `TypeScript`, `Zustand`, `Socket.IO Client`, `Vite` |
| Backend | `Node.js`, `Express`, `Socket.IO`, `TypeScript` |
| Инфраструктура | `Docker`, `docker-compose`, `GitHub Actions` |

## Ключевые особенности

- **3D-сцена и анимации:** GLB-модели рыцаря, дракона и бесконечного процедурного подземелья, системы частиц (огонь, пепел, пыль), эффекты `Bloom`, `ChromaticAberration`, `ACES Filmic ToneMapping` и динамическая тряска камеры на высоких множителях.
- **Real-time мультиплеер:** синхронизация фаз раунда (`WAITING → RUNNING → CRASHED`), ставки, авто-кэшаут и история множителей через `Socket.IO`.
- **Resilient Demo Mode:** при недоступности WebSocket-сервера клиент автоматически переключается в локальную симуляцию раундов (с ботами, статистикой сессии и балансом), сохраняя полную играбельность на статическом хостинге.

## Локальный запуск

```bash
# Через Docker Compose (client + server)
docker compose up --build

# Либо раздельно
cd server && npm install && npm run dev
cd client && npm install --legacy-peer-deps && npm run dev
```
