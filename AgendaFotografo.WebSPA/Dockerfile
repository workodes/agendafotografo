# SPA Angular (AgendaFotografo.WebSPA) servido por Nginx, que também faz o proxy de /api para a API.

# ---------- build ----------
FROM node:22-slim AS build
WORKDIR /app

# Dependências primeiro (cache). O .npmrc traz legacy-peer-deps=true, exigido pelo Fuse.
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .
# Produção: troca environment.ts por environment.prod.ts (API em /api, mesma origem). Saída em dist/wwwroot.
RUN npx ng build --configuration production

# ---------- runtime ----------
FROM nginx:1.27-alpine
ENV TZ=America/Sao_Paulo
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/agendafotografo.conf
COPY --from=build /app/dist/wwwroot /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
