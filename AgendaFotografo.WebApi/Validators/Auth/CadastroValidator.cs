using AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;
using AgendaFotografo.WebApi.Models.Auth;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Auth;

/// <summary>Regras de nome, telefone e CPF/CNPJ do autocadastro (todos obrigatórios). Compartilhadas pelo cadastro manual e pelo do Google.</summary>
internal static class CadastroRegras
{
    public static void Nome<T>(AbstractValidator<T> v, System.Linq.Expressions.Expression<Func<T, string>> campo)
        => v.RuleFor(campo).NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres");

    public static void Telefone<T>(AbstractValidator<T> v, System.Linq.Expressions.Expression<Func<T, string>> campo)
        => v.RuleFor(campo).Cascade(CascadeMode.Stop).NotEmpty().WithMessage("Telefone é obrigatório").TelefoneValido();

    public static void CpfCnpj<T>(AbstractValidator<T> v, System.Linq.Expressions.Expression<Func<T, string>> campo)
        => v.RuleFor(campo).Cascade(CascadeMode.Stop).NotEmpty().WithMessage("CPF/CNPJ é obrigatório").CpfOuCnpjValido();
}

public class CadastroValidator : AbstractValidator<CadastroModel>
{
    public CadastroValidator()
    {
        CadastroRegras.Nome(this, x => x.ASS_NOME);
        RuleFor(x => x.ASS_EMAIL).EmailObrigatorio()
            .MaximumLength(200).WithMessage("E-mail deve ter no máximo 200 caracteres");
        CadastroRegras.Telefone(this, x => x.ASS_TELEFONE);
        CadastroRegras.CpfCnpj(this, x => x.ASS_CPF_CNPJ);
        RuleFor(x => x.Senha).SenhaMinima8();
    }
}

public class CadastroGoogleValidator : AbstractValidator<CadastroGoogleModel>
{
    public CadastroGoogleValidator()
    {
        CadastroRegras.Nome(this, x => x.ASS_NOME);
        CadastroRegras.Telefone(this, x => x.ASS_TELEFONE);
        CadastroRegras.CpfCnpj(this, x => x.ASS_CPF_CNPJ);
    }
}
