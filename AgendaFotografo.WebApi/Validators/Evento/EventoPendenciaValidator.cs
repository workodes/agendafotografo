using AgendaFotografo.WebApi.Models.Eventos;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Evento;

/// <summary>Validação do formato da pendência. Existência do evento/responsável e atividade são checadas no controller.</summary>
public class EventoPendenciaValidator : AbstractValidator<EventoPendenciaModel>
{
    private static readonly DateOnly PrazoMinimo = new(2000, 1, 1);
    private static readonly DateOnly PrazoMaximo = new(2100, 12, 31);

    public EventoPendenciaValidator()
    {
        RuleFor(x => x.EVP_EVENTO_ID).NotEqual(Guid.Empty).WithMessage("Evento é obrigatório");
        RuleFor(x => x.EVP_TITULO).NotEmpty().WithMessage("Título é obrigatório")
            .MaximumLength(200).WithMessage("Título deve ter no máximo 200 caracteres");
        RuleFor(x => x.EVP_CATEGORIA).IsInEnum().WithMessage("Categoria inválida");
        RuleFor(x => x.EVP_PRIORIDADE).IsInEnum().WithMessage("Prioridade inválida");
        RuleFor(x => x.EVP_STATUS).IsInEnum().WithMessage("Status inválido");
        RuleFor(x => x.EVP_PRAZO!.Value)
            .Must(p => p >= PrazoMinimo && p <= PrazoMaximo).WithMessage("Prazo deve estar entre 2000 e 2100")
            .When(x => x.EVP_PRAZO is not null);
        RuleFor(x => x.EVP_OBSERVACOES!).MaximumLength(2000).WithMessage("Observações devem ter no máximo 2000 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.EVP_OBSERVACOES));
    }
}

public class EventoPendenciaStatusValidator : AbstractValidator<EventoPendenciaStatusModel>
{
    public EventoPendenciaStatusValidator()
    {
        RuleFor(x => x.EVP_STATUS).IsInEnum().WithMessage("Status inválido");
    }
}
