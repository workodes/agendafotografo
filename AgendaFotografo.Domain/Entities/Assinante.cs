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

    /// <summary>
    /// Tipo da conta (plano 24): 1 = conta com plano (coordenador ou fotógrafo pago, role Assinante); 2 = Gratuito (só vê a agenda da
    /// escala, role Fotografo). O nome do enum foi mantido.
    /// </summary>
    public TipoAssinante ASS_TIPO { get; set; } = TipoAssinante.Coordenador;

    /// <summary>
    /// Plano da conta (plano 24). Nulo = sem plano: o Gratuito sempre; um coordenador só na janela entre a migration e o Seed (fica só com a base).
    /// </summary>
    public Guid? ASS_PLANO_ID { get; set; }
    public Plano? Plano { get; set; }
}
