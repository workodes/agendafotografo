using AgendaFotografo.WebApi.Models.Planos;
using AgendaFotografo.WebApi.Validators.Financeiro;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Plano;

/// <summary>Validação do formato da ficha do plano (plano 24). O nome único é checado no controller (consulta ao banco).</summary>
public class PlanoValidator : AbstractValidator<PlanoModel>
{
    public PlanoValidator()
    {
        RuleFor(x => x.PLA_NOME).NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(100).WithMessage("Nome deve ter no máximo 100 caracteres");
        RuleFor(x => x.PLA_VALOR).ValorEmReaisOuZero();
        RuleFor(x => x.PLA_RECORRENCIA).IsInEnum().WithMessage("Recorrência inválida");
        RuleFor(x => x.PLA_DESCRICAO).MaximumLength(300).WithMessage("Descrição deve ter no máximo 300 caracteres");
        RuleFor(x => x.PLA_ORDEM).InclusiveBetween(0, 999).WithMessage("Ordem deve estar entre 0 e 999");

        RuleForEach(x => x.Modulos).ChildRules(m =>
        {
            m.RuleFor(i => i.PLM_MODULO).IsInEnum().WithMessage("Módulo inválido.");
            m.RuleFor(i => i.PLM_TEXTO_LANDING).MaximumLength(150)
                .WithMessage("Texto do módulo na landing deve ter no máximo 150 caracteres");
        });

        RuleFor(x => x.Modulos)
            .Must(lista => lista.Select(i => i.PLM_MODULO).Distinct().Count() == lista.Count)
            .WithMessage("Módulo repetido.");
    }
}
