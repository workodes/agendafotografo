# API (AgendaFotografo.WebApi). Contexto do build: raiz do repositório (ver docker-compose.yml).

# ---------- build ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# 1) Só os .csproj primeiro: o restore fica em cache enquanto as dependências não mudarem.
COPY AgendaFotografo.Domain/AgendaFotografo.Domain.csproj             AgendaFotografo.Domain/
COPY AgendaFotografo.Infra.Data/AgendaFotografo.Infra.Data.csproj     AgendaFotografo.Infra.Data/
COPY AgendaFotografo.CrossCutting/AgendaFotografo.CrossCutting.csproj AgendaFotografo.CrossCutting/
COPY AgendaFotografo.WebApi/AgendaFotografo.WebApi.csproj             AgendaFotografo.WebApi/
RUN dotnet restore AgendaFotografo.WebApi/AgendaFotografo.WebApi.csproj

# 2) Código-fonte e publish (o publish já compila; não precisa de um "dotnet build" separado).
COPY AgendaFotografo.Domain/       AgendaFotografo.Domain/
COPY AgendaFotografo.Infra.Data/   AgendaFotografo.Infra.Data/
COPY AgendaFotografo.CrossCutting/ AgendaFotografo.CrossCutting/
COPY AgendaFotografo.WebApi/       AgendaFotografo.WebApi/
RUN dotnet publish AgendaFotografo.WebApi/AgendaFotografo.WebApi.csproj \
    -c Release -o /app/publish --no-restore /p:UseAppHost=false

# ---------- runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
ENV ASPNETCORE_HTTP_PORTS=8080 \
    TZ=America/Sao_Paulo
WORKDIR /app

# Pasta dos arquivos enviados (flyer, rota, GPX). Montada como volume no compose; criada aqui já com o dono
# certo para o volume nascer com essa permissão (a API roda sem root).
RUN mkdir -p /app/dados/arquivos && chown -R $APP_UID:$APP_UID /app/dados

COPY --from=build /app/publish .

USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "AgendaFotografo.WebApi.dll"]
