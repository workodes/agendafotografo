using AgendaFotografo.Domain.Enums;
using AgendaFotografo.WebApi.Models.Eventos;

namespace AgendaFotografo.WebApi.Models.Chat;

/// <summary>Corpo do <c>Chat/Enviar</c>: o histórico inteiro da conversa (a última mensagem tem que ser do usuário).</summary>
public class ChatEnviarModel
{
    public List<ChatMensagemItem> Mensagens { get; set; } = [];
}

public class ChatMensagemItem
{
    /// <summary>1 Usuario, 2 Assistente.</summary>
    public PapelChat Papel { get; set; }
    public string Texto { get; set; } = string.Empty;

    /// <summary>Só no papel 2: o rascunho no estado atual do card (vira um resumo textual para o modelo; os ids são revalidados).</summary>
    public ChatRascunho? Rascunho { get; set; }

    /// <summary>Só na última mensagem e só no papel Usuario: imagem do flyer (até 2 MB decodificados). Nunca é logada nem gravada.</summary>
    public ChatImagemModel? Imagem { get; set; }
}

/// <summary>Imagem anexada. O servidor ignora o <c>MediaType</c> informado e usa o detectado pela assinatura dos bytes (JPG, PNG ou WEBP).</summary>
public class ChatImagemModel
{
    public string MediaType { get; set; } = string.Empty;
    public string Base64 { get; set; } = string.Empty;
}

public class ChatEnviarResponse
{
    /// <summary>Até 2.000 caracteres.</summary>
    public string Texto { get; set; } = string.Empty;

    /// <summary>No máximo um por resposta; nulo quando não há.</summary>
    public ChatRascunho? Rascunho { get; set; }

    /// <summary>Eventos citados nesta resposta (vindos de <c>BuscarEventos</c> e <c>ConsultarDia</c>), no máximo 10, sem repetir. Vazio quando não há.</summary>
    public List<EventoResumo> Eventos { get; set; } = [];
}

/// <summary>Evento proposto pela IA (nada é gravado). <c>Evento</c> segue o <see cref="EventoModel"/> com <c>Id</c> nulo e status Pendente.</summary>
public class ChatRascunho
{
    public EventoModel Evento { get; set; } = new();
    public List<ChatRascunhoMembro> Membros { get; set; } = [];
    public List<string> Avisos { get; set; } = [];

    /// <summary>Eventos não cancelados de nome parecido entre a data -1 e +1 dia (no máximo 3). Só avisa, nunca bloqueia.</summary>
    public List<EventoResumo> Semelhantes { get; set; } = [];
}

public class ChatRascunhoMembro
{
    public Guid EVM_MEMBRO_ID { get; set; }
    public string MEM_NOME { get; set; } = string.Empty;
    public string? MEM_INSTAGRAM { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }
    public string? EVM_POSICAO { get; set; }

    /// <summary>Outros eventos não cancelados do membro na mesma data (conflito; só avisa).</summary>
    public List<EventoResumo> OutrosEventos { get; set; } = [];
}

public class ChatStatusResponse
{
    public bool Ligado { get; set; }
    public int LimiteDiario { get; set; }
    public int UsadasHoje { get; set; }
}
