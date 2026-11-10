# Assistente com IA

O Assistente (planos 11 e 12) usa um modelo de linguagem apenas como "chat completions" com function calling: lança eventos (por texto ou pela foto do flyer) e responde perguntas sobre a agenda, tudo só leitura (quem grava, ao confirmar, é o SPA). As ferramentas rodam na
`AgendaFotografo.WebApi` (`ChatController`). **Nenhuma chave vai para este documento, para o git ou para o SPA.**

Sem a configuração completa o chat fica desligado e o sistema funciona normalmente (`GET api/Chat/Status` devolve `Ligado = false`).

> **Atenção (LGPD):** o que o Assistente envia ao provedor (OpenAI) é **processado fora do Brasil**. Vão ao provedor: as mensagens digitadas, a **imagem do flyer** anexada (até 2 MB, só durante a requisição; não é gravada pela API nem anexada ao evento) e, nas consultas à agenda, nomes de eventos, datas, cidades, locais, tipos, nomes de organizadores e nomes, funções e posições da equipe, além de pendências feitas/total. **Nunca** vão notas internas, informações e observações da equipe dos eventos, links, e-mail e telefone de membros e organizadores nem ids de eventos.
> Avise os assinantes e não use o chat para dados sensíveis.

## Configuração (`IA`)

| Chave | Variável (Dokploy) | Descrição |
|---|---|---|
| `IA:Provedor` | `AGENDA_IA_PROVEDOR` | `OpenAI` (padrão) ou `AzureOpenAI`. Outro valor desliga o chat (aviso no log). |
| `IA:ApiKey` | `AGENDA_IA_APIKEY` | Chave de API. |
| `IA:Modelo` | `AGENDA_IA_MODELO` | Nome do modelo (OpenAI) ou do deployment (AzureOpenAI). |
| `IA:Endpoint` | `AGENDA_IA_ENDPOINT` | Opcional na OpenAI (se preenchido, é a URL base de um provedor compatível com a API da OpenAI). Obrigatório no AzureOpenAI. |
| `IA:LimiteDiario` | `AGENDA_IA_LIMITE_DIARIO` | Mensagens por assinante por dia (padrão 100). |

O chat só liga com `ApiKey` e `Modelo` preenchidos (e `Endpoint` URL absoluta no AzureOpenAI). No `docker-compose.yml` as variáveis viram
`IA__Provedor`, `IA__ApiKey`, `IA__Modelo`, `IA__Endpoint` e `IA__LimiteDiario`; o arquivo não tem nenhum valor real.

## Passo a passo: OpenAI (platform.openai.com)

1. **Criar a conta** em platform.openai.com e um **projeto** para o AgendaFotografo (assim a chave e o gasto ficam isolados).
2. **Gerar uma chave de projeto** (*API keys* do projeto). Ela aparece uma única vez: guarde no gerenciador de senhas.
3. **Adicionar créditos pré-pagos** (*Billing*). Sem crédito a API responde erro e o chat mostra "Não foi possível falar com o assistente agora".
4. **Definir limite de gasto mensal e alerta** (*Billing > Limits*): um teto mensal e um alerta por e-mail em, por exemplo, 50% e 80%.
   Além disso, a API limita **100 mensagens por assinante por dia** (`IA:LimiteDiario`, em memória).
5. **Escolher o modelo**: um modelo "mini" (baixo custo) que suporte **function calling** e **entrada de imagem** (leitura de flyer), conferindo na documentação de modelos da OpenAI (o `gpt-4.1-mini` atende). Com um modelo sem visão, a mensagem com imagem cai no 400 "Não foi possível falar com o assistente agora. Tente de novo.". Informar o nome em `IA:Modelo`.
6. **Colocar a chave**:
   - **Local (desenvolvimento):** de preferência *User Secrets* (`dotnet user-secrets set "IA:ApiKey" "..." --project AgendaFotografo.WebApi`, e o mesmo para `IA:Modelo`),
     ou `appsettings.json` local sem commitar. **Nunca commitar a chave.**
   - **Produção (Dokploy):** em *Environment* do projeto, definir `AGENDA_IA_APIKEY` e `AGENDA_IA_MODELO` (e `AGENDA_IA_PROVEDOR` só se não for OpenAI). Novo deploy ou reinício do `agenda-api`.
7. **Testar** pelo `GET api/Chat/Status` (logado como Assinante): deve devolver `{ "Ligado": true, "LimiteDiario": 100, "UsadasHoje": 0 }`. Depois, pelo painel "Assistente", enviar uma mensagem de evento.

## Alternativa: Azure OpenAI

1. Criar o recurso Azure OpenAI/Foundry no portal do Azure e escolher uma região onde exista um modelo "mini" com function calling.
2. Publicar o deployment como **Global Standard** (o processamento pode ocorrer fora do Brasil) e anotar o **nome do deployment**.
3. Configurar `IA:Provedor = AzureOpenAI`, `IA:Endpoint` = URL do recurso (ex.: `https://<recurso>.openai.azure.com/`), `IA:Modelo` = **nome do deployment** e `IA:ApiKey` = chave do recurso.
4. Definir cota de tokens no deployment e orçamento com alerta no *Cost Management*.

## Pontos de atenção

- **Uma só instância da API**: o limite diário fica em memória (como as tentativas do link público).
- **Timeouts**: a chamada ao modelo expira em 60 s; o `proxy_read_timeout` do `/api/` no `nginx.conf` é 120 s. Mudou um, revisar o outro.
- **Logs**: a API registra só o Id do assinante, se a mensagem tinha imagem (`ComImagem`) e os tokens consumidos. O texto das mensagens, a imagem, o rascunho e a chave nunca são logados.
- **Imagem do flyer**: o corpo do `Chat/Enviar` aceita até 3 MB (imagem de até 2 MB decodificados, JPG, PNG ou WEBP, reduzida pelo SPA antes de enviar); mensagem com imagem conta 1 no limite diário. O Azure OpenAI também precisa de um deployment com visão.
- **Filtro de conteúdo** do provedor: se bloquear uma mensagem, o usuário vê "Não foi possível falar com o assistente agora. Tente de novo.".
