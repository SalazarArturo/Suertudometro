# syntax=docker/dockerfile:1

# 1. Dependencias completas (incluye las de desarrollo, para compilar).
FROM node:24-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Compilación de TypeScript y poda de las dependencias de desarrollo.
FROM dependencias AS compilacion
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# 3. Imagen final: solo dist/ y las dependencias de producción, sin usuario root.
FROM node:24-alpine AS ejecucion
ENV NODE_ENV=production
WORKDIR /app
COPY --from=compilacion /app/package.json ./
COPY --from=compilacion /app/node_modules ./node_modules
COPY --from=compilacion /app/dist ./dist
USER node
EXPOSE 8081
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PUERTO:-8081}/salud" || exit 1
CMD ["node", "dist/main.js"]
