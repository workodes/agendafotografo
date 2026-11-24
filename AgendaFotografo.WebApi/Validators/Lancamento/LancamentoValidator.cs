using AgendaFotografo.WebApi.Models.Financeiro;
using AgendaFotografo.WebApi.Validators.Financeiro;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Lancamento;

/// <summary>Validação do formato da ficha do lançamento (não consulta o banco).</summary>
public class LancamentoValidator : AbstractValidator<LancamentoModel>
{
    public LancamentoValidator()
    {
        RuleFor(x => x.LAN_TIPO).IsInEnum().WithMessage("Tipo inválido");
        RuleFor(x => x.LAN_TITULO).NotEmpty().WithMessage("Título é obrigatório")
            .MaximumLength(200).WithMessage("Título deve ter no máximo 200 caracteres");
        RuleFor(x => x.LAN_VALOR).ValorEmReais();
        RuleFor(x => x.LAN_DATA)
            .Must(d => d.Year is >= 2000 and <= 2100).WithMessage("Data é obrigatória e deve estar entre 2000 e 2100");
        RuleFor(x => x.LAN_CATEGORIA).IsInEnum().WithMessage("Categoria inválida");
        RuleFor(x => x.LAN_OBSERVACOES).MaximumLength(2000).WithMessage("Observações devem ter no máximo 2000 caracteres");
    }
}
