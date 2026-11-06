#!/usr/bin/env python3
"""Importa os eventos da "Agenda de eventos" do Notion para um assinante, pela API (não toca no banco).

Uso:
  AGENDA_API=https://seu-dominio AGENDA_EMAIL=assinante@x.com AGENDA_SENHA=... python3 scripts/importar_notion.py            # simulação
  ... python3 scripts/importar_notion.py --aplicar                                                                       # grava
  --todos        inclui também os eventos já passados (por padrão só de hoje em diante)
  --sem-escala   importa só os eventos, sem criar membros nem escalar

Pula eventos que já existem (mesmo nome + data), então pode ser repetido.
Horários do Notion vêm em UTC e são convertidos para Brasília (UTC-3).
"""
import json, os, re, sys, urllib.request, urllib.error
from datetime import datetime, timedelta

# (nome, status[1 Pend,2 Conf,3 Real], data_utc_ou_data, local, notas, [instagrams])
E = json.loads(open(os.path.join(os.path.dirname(__file__), "notion_eventos.json"), encoding="utf-8").read())

API = os.environ.get("AGENDA_API", "").rstrip("/")
APLICAR = "--aplicar" in sys.argv
SEM_ESCALA = "--sem-escala" in sys.argv
STATUS = {"Pendente": 1, "Confirmado": 2, "Realizado": 3, "Cancelado": 4}

def req(metodo, caminho, corpo=None, token=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    r = urllib.request.Request(f"{API}/api/{caminho}", data=dados, method=metodo)
    r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            t = resp.read().decode()
            return json.loads(t) if t else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{metodo} {caminho} -> {e.code}: {e.read().decode()[:300]}")

def tipo_por_nome(nome):
    n = nome.lower()
    if "casamento" in n: return "Casamento"
    if "crossfit" in n or "gaivotas" in n or "murphy" in n or "box " in n or "no limite" in n: return "CrossFit"
    if "moto" in n: return "Moto passeio"
    if "treino" in n or "treinão" in n or "reconhecimento" in n: return "Treino"
    if "corrida" in n or "run" in n or "caminhada" in n or "desafio" in n or "pink move" in n or "pace" in n or "track" in n: return "Corrida"
    return "Outro"

def cidade(local):
    if not local: return "Linhares"
    m = re.search(r"([A-ZÀ-Ú][\wÀ-ú ]+?)\s*-\s*ES", local)
    return (m.group(1).strip().split(",")[-1].strip() if m else "Linhares")[:100]

def data_hora(s):
    if "Z" in s:
        d = datetime.strptime(s, "%Y-%m-%d %H:%M:%SZ") - timedelta(hours=3)
        return d.strftime("%Y-%m-%d"), d.strftime("%H:%M:%S")
    return s, None

if not API: raise SystemExit("Defina AGENDA_API (ex.: https://dominio-de-producao)")
tipos_nome = {}
if APLICAR or os.environ.get("AGENDA_EMAIL"):
    email, senha = os.environ["AGENDA_EMAIL"], os.environ["AGENDA_SENHA"]
    login = req("POST", "Auth/Login", {"Email": email, "Password": senha})
    token = login["Token"]
    if login["Role"] != "Assinante": raise SystemExit("Entre com um usuário Assinante.")
    print(f"Logado como {login.get('AssinanteNome')} ({email})")
else:
    token = None

def listar_todos(caminho):
    out, p = [], 1
    while True:
        r = req("GET", f"{caminho}{'&' if '?' in caminho else '?'}page={p}&pageSize=100", token=token)
        out += r["Data"]
        if len(out) >= r["TotalCount"] or not r["Data"]: return out
        p += 1

tipos = {t["TPE_NOME"].lower(): t["Id"] for t in listar_todos("TipoEvento/Listar?ativo=todos")} if token else {}
membros = {(m.get("MEM_INSTAGRAM") or "").lower(): m["Id"] for m in listar_todos("Membro/Listar?ativo=todos")} if token and not SEM_ESCALA else {}
existentes = {(e["EVE_NOME"].strip().lower(), str(e["EVE_DATA"])[:10]) for e in listar_todos("Evento/Listar")} if token else set()

from datetime import date
HOJE = date.today().isoformat()
E = [e for e in E if "--todos" in sys.argv or data_hora(e[2])[0] >= HOJE]  # por padrão só os próximos (hoje em diante)
criados = pulados = 0
for nome, st, quando, local, notas, fotos in E:
    data, hora = data_hora(quando)
    tipo = tipo_por_nome(nome)
    linha = f"{data} {hora or '--:--:--'} | {nome[:55]:55} | {tipo:12} | {cidade(local):10} | st={st} | escala={len(fotos)}"
    if (nome.strip().lower(), data) in existentes:
        print("JÁ EXISTE  " + linha); pulados += 1; continue
    print(("CRIANDO    " if APLICAR else "SIMULAÇÃO  ") + linha)
    if not APLICAR: continue
    if tipo.lower() not in tipos: raise SystemExit(f"Tipo de evento '{tipo}' não existe neste assinante.")
    ev = req("POST", "Evento/Criar", {
        "EVE_NOME": nome, "EVE_TIPO_EVENTO_ID": tipos[tipo.lower()], "EVE_DATA": data, "EVE_HORA": hora,
        "EVE_CIDADE": cidade(local), "EVE_LOCAL": (local or None) and local[:200], "EVE_STATUS": st,
        "EVE_NOTAS_INTERNAS": notas}, token)
    criados += 1
    if SEM_ESCALA: continue
    for ig in fotos:
        k = ig.lower()
        if k not in membros:
            m = req("POST", "Membro/Criar", {"MEM_NOME": ig, "MEM_INSTAGRAM": ig, "MEM_FUNCAO": 1}, token)
            membros[k] = m["Id"]
        req("POST", "Evento/AdicionarMembro", {"EVM_EVENTO_ID": ev["Id"], "EVM_MEMBRO_ID": membros[k]}, token)
print(f"\n{'Criados' if APLICAR else 'A criar'}: {criados if APLICAR else len(E)-pulados} | já existentes: {pulados} | total no Notion: {len(E)}")
