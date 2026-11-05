using AgendaFotografo.WebApi.Models.Eventos;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Evento;

/// <summary>Validação do formato da entrada da escala. Existência, atividade e duplicidade são checadas no controller.</summary>
public class EventoMembroValidator : AbstractValidator<EventoMembroModel>
{
    public EventoMembroValidator()
    {
        RuleFor(x => x.EVM_EVENTO_ID).NotEqual(Guid.Empty).WithMessage("Evento é obrigatório");
        RuleFor(x => x.EVM_MEMBRO_ID).NotEqual(Guid.Empty).WithMessage("Membro é obrigatório");
        RuleFor(x => x.EVM_POSICAO!).MaximumLength(150).WithMessage("Posição deve ter no máximo 150 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.EVM_POSICAO));
    }
}

public class EventoMembroPosicaoValidator : AbstractValidator<EventoMembroPosicaoModel>
{
    public EventoMembroPosicaoValidator()
    {
        RuleFor(x => x.EVM_POSICAO!).MaximumLength(150).WithMessage("Posição deve ter no máximo 150 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.EVM_POSICAO));
    }
}
