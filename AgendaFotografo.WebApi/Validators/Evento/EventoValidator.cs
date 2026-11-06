using System.Linq.Expressions;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.WebApi.Models.Eventos;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Evento;

/// <summary>
/// Validação do formato da ficha (já normalizada). A existência e a atividade do tipo e do organizador são checadas
/// no controller (consulta ao banco).
/// </summary>
public class EventoValidator : AbstractValidator<EventoModel>
{
    private const int LimiteTexto = 4000;

    public EventoValidator()
    {
        RuleFor(x => x.EVE_NOME).NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres");

        RuleFor(x => x.EVE_TIPO_EVENTO_ID).NotEqual(Guid.Empty).WithMessage("Tipo de evento é obrigatório");

        RuleFor(x => x.EVE_DATA).Cascade(CascadeMode.Stop)
            .Must(d => d != default).WithMessage("Data é obrigatória")
            .Must(d => d.Year >= 2000 && d.Year <= 2100).WithMessage("Data deve estar entre os anos 2000 e 2100");

        RuleFor(x => x.EVE_CIDADE).NotEmpty().WithMessage("Cidade é obrigatória")
            .MaximumLength(100).WithMessage("Cidade deve ter no máximo 100 caracteres");

        RuleFor(x => x.EVE_LOCAL).MaximumLength(200).WithMessage("Local deve ter no máximo 200 caracteres");

        RuleFor(x => x.EVE_STATUS).Must(s => Enum.IsDefined(s)).WithMessage("Status é obrigatório");

        RuleFor(x => x.EVE_LARGADA_LOCAL!).MaximumLength(300).WithMessage("Local da largada deve ter no máximo 300 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.EVE_LARGADA_LOCAL));
        RuleFor(x => x.EVE_CHEGADA_LOCAL!).MaximumLength(300).WithMessage("Local da chegada deve ter no máximo 300 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.EVE_CHEGADA_LOCAL));

        Link(x => x.EVE_LARGADA_LINK, "Link da largada");
        Link(x => x.EVE_CHEGADA_LINK, "Link da chegada");
        Link(x => x.EVE_LINK_INSCRICAO, "Link de inscrição");
        Link(x => x.EVE_LINK_FOTOS, "Link das fotos");
        Link(x => x.EVE_ROTA_LINK_MAPS, "Link do Maps da rota");
        Link(x => x.EVE_ROTA_LINK_STRAVA, "Link do Strava");

        Texto(x => x.EVE_INFORMACOES, "Informações");
        Texto(x => x.EVE_OBSERVACOES_EQUIPE, "Observações para a equipe");
        Texto(x => x.EVE_NOTAS_INTERNAS, "Notas internas");
    }

    private void Link(Expression<Func<EventoModel, string?>> campo, string rotulo)
    {
        var obter = campo.Compile();
        RuleFor(campo!).MaximumLength(500).WithMessage($"{rotulo} deve ter no máximo 500 caracteres")
            .Must(UrlHttpValida).WithMessage($"{rotulo} deve ser uma URL válida (http ou https)")
            .When(x => !string.IsNullOrWhiteSpace(obter(x)));
    }

    private void Texto(Expression<Func<EventoModel, string?>> campo, string rotulo)
    {
        var obter = campo.Compile();
        RuleFor(campo!).MaximumLength(LimiteTexto).WithMessage($"{rotulo} deve ter no máximo {LimiteTexto} caracteres")
            .When(x => !string.IsNullOrWhiteSpace(obter(x)));
    }

    /// <summary>Só URL absoluta http ou https, sem espaços.</summary>
    private static bool UrlHttpValida(string? valor)
        => !string.IsNullOrWhiteSpace(valor) && !valor.Any(char.IsWhiteSpace) &&
           Uri.TryCreate(valor, UriKind.Absolute, out var uri) &&
           (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) && !string.IsNullOrEmpty(uri.Host);
}
