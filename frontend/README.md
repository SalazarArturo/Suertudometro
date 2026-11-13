# frontend

Aplicación web de Suertudómetro: Angular 22, Angular Material 22 y Vitest. El diseño (zonas, rutas, sesión, errores y convenciones para las pantallas) está en [`docs/frontend.md`](../docs/frontend.md).

## Requisitos

- Node.js 24 y npm 11.
- Para hablar con el API, el api-gateway en `http://localhost:8080` (`src/environments/environment.ts`).

## Comandos

```bash
npm ci                 # instala las dependencias
npm start              # servidor de desarrollo en http://localhost:4200
npm test               # pruebas unitarias (Vitest); npm run test:watch las deja mirando cambios
npm run lint           # angular-eslint, también sobre las plantillas
npm run format:check   # Prettier (npm run format corrige)
npm run build          # build de producción en dist/frontend/browser
```

## Docker

```bash
docker build --tag frontend .
docker run --rm -p 4200:80 frontend   # http://localhost:4200
```
