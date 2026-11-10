namespace AgendaFotografo.Domain.Enums;

/// <summary>Quem escreveu a mensagem do chat com o assistente. Valores fixos (trafegam como número no JSON). Não existe papel "sistema" vindo do cliente.</summary>
public enum PapelChat
{
    Usuario = 1,
    Assistente = 2
}
