using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>Assinante (coordenador da equipe de fotógrafos). É o tenant: todo dado de negócio pertence a um assinante.</summary>
public class Assinante : BaseEntity
{
    public string ASS_NOME { get; set; } = string.Empty;
    public string? ASS_CPF_CNPJ { get; set; }
    public string ASS_EMAIL { get; set; } = string.Empty;
    public string? ASS_TELEFONE { get; set; }

    /// <summary>Quando falso, o assinante está bloqueado: o login é negado e a sessão dos usuários dele cai.</summary>
    public bool ASS_ATIVO { get; set; } = true;

    /// <summary>Último dia do teste grátis (sem hora, vale até o fim do dia). Nulo = sem prazo.</summary>
    public DateOnly? ASS_TESTE_ATE { get; set; }

    /// <summary>Quem criou o assinante: o Admin (padrão) ou o próprio coordenador pelo autocadastro.</summary>
    public OrigemAssinante ASS_ORIGEM { get; set; } = OrigemAssinante.Admin;
}
