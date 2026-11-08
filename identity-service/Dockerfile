# syntax=docker/dockerfile:1

# 1. Dependencias completas (incluye las de desarrollo, para compilar).
#    `npm ci` también genera el cliente de Prisma (postinstall), por eso el
#    esquema se copia antes. El motor de migraciones de Prisma necesita OpenSSL.
FROM node:24-alpine AS dependencias
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# 2. Compilación de TypeScript (incluye el cliente generado) y poda de las
#    dependencias de desarrollo.
FROM dependencias AS compilacion
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# 3. Imagen final: dist/, las migraciones y las dependencias de producción,
#    sin usuario root.
FROM node:24-alpine AS ejecucion
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=compilacion /app/package.json /app/prisma.config.ts ./
COPY --from=compilacion /app/prisma ./prisma
COPY --from=compilacion /app/node_modules ./node_modules
COPY --from=compilacion /app/dist ./dist
USER node
EXPOSE 8081
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PUERTO:-8081}/salud" || exit 1
# Aplica las migraciones pendientes y arranca. `exec` deja a Node como proceso
# principal, para que reciba la señal de parada de Docker.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node dist/main.js"]
