using System.Text.RegularExpressions;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.Infra.Data.Context;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Assinantes;

/// <summary>Dados para criar um assinante e o usuário de login dele (já normalizados por quem chama).</summary>
public class AssinanteCadastroDados
{
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Telefone { get; set; }
    public string? CpfCnpj { get; set; }
    public OrigemAssinante Origem { get; set; }
    public DateOnly? TesteAte { get; set; }
    public bool EmailConfirmado { get; set; }
    public bool ExigirTrocaSenha { get; set; }
}

/// <summary>Login externo (ex.: Google) a ligar ao usuário recém-criado. <c>Chave</c> é o identificador da pessoa no provedor (<c>sub</c>).</summary>
public record LoginExternoDados(string Provedor, string Chave);

/// <summary>
/// Ponto único das regras de cadastro de assinante: normalização, unicidade de e-mail e CPF/CNPJ, tradução dos erros do Identity e
/// criação de assinante + usuário. Usado pelo <c>AssinanteController</c> (Admin) e pelo autocadastro (<c>AuthController</c>).
/// <see cref="CriarAsync"/> roda DENTRO da transação de quem chama e nunca chama SaveChanges nem Commit.
/// </summary>
public class AssinanteCadastro(
    IBaseRepository<Assinante> repAssinante,
    UserManager<Usuario> userManager,
    EfDbContext db,
    IAssinanteInicializacao assinanteInicializacao)
{
    private readonly IBaseRepository<Assinante> _repAssinante = repAssinante;
    private readonly UserManager<Usuario> _userManager = userManager;
    private readonly EfDbContext _db = db;
    private readonly IAssinanteInicializacao _assinanteInicializacao = assinanteInicializacao;

    public const string MsgEmailDuplicado = "Já existe um usuário com este e-mail.";
    public const string MsgEmailDuplicadoAutocadastro = "Já existe um usuário com este e-mail. Entre pela aba Entrar.";
    public const string MsgCpfCnpjDuplicado = "Já existe um assinante com este CPF/CNPJ.";
    public const string MsgEmailInvalidoLogin = "E-mail inválido para login.";
    public const string MsgSenhaCurta = "A senha deve ter no mínimo 8 caracteres";

    /// <summary>Mensagem de e-mail duplicado conforme a origem (o autocadastro sugere entrar pela aba Entrar).</summary>
    public static string MensagemEmailDuplicado(OrigemAssinante origem)
        => origem == OrigemAssinante.Autocadastro ? MsgEmailDuplicadoAutocadastro : MsgEmailDuplicado;

    /// <summary>Trim e minúsculas.</summary>
    public static string NormalizarEmail(string? email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    /// <summary>Só dígitos; vazio vira nulo.</summary>
    public static string? SomenteDigitosOuNulo(string? valor)
    {
        var digitos = Regex.Replace(valor ?? string.Empty, @"\D", "");
        return digitos.Length == 0 ? null : digitos;
    }

    public static bool EhDuplicidade(DbUpdateException ex)
        => (ex.InnerException?.Message ?? string.Empty).Contains("Duplicate entry", StringComparison.OrdinalIgnoreCase);

    /// <summary>Traduz os erros do Identity sem repassar texto livre (nunca inclui senha).</summary>
    public static string TraduzirErros(IdentityResult resultado, string padrao, OrigemAssinante origem = OrigemAssinante.Admin)
        => resultado.Errors.Any(e => e.Code is "DuplicateEmail" or "DuplicateUserName") ? MensagemEmailDuplicado(origem)
            : resultado.Errors.Any(e => e.Code is "InvalidUserName" or "InvalidEmail") ? MsgEmailInvalidoLogin
            : resultado.Errors.Any(e => e.Code == "PasswordTooShort") ? MsgSenhaCurta
            : padrao;

    /// <summary>Compara pelo e-mail normalizado (sem diferenciar caixa), excluindo o próprio usuário quando informado. Vale para qualquer usuário (inclusive o admin).</summary>
    public async Task<bool> EmailEmUsoAsync(string email, string? usuarioIdAtual, CancellationToken cancellationToken)
    {
        var normalizado = _userManager.NormalizeEmail(email);
        return await _db.Users.AsNoTracking().AnyAsync(
            u => (u.NormalizedEmail == normalizado || u.NormalizedUserName == normalizado) && (usuarioIdAtual == null || u.Id != usuarioIdAtual),
            cancellationToken);
    }

    /// <summary>
    /// Antes de trocar o login, roda os validadores do Identity (caracteres permitidos no UserName, formato do e-mail e duplicidade)
    /// num usuário descartável com o mesmo Id, sem tocar na entidade rastreada.
    /// </summary>
    public async Task ValidarLoginIdentityAsync(string usuarioId, string email)
    {
        var candidato = new Usuario { Id = usuarioId, UserName = email, Email = email };
        foreach (var validador in _userManager.UserValidators)
        {
            var resultado = await validador.ValidateAsync(_userManager, candidato);
            if (resultado.Succeeded) continue;

            if (resultado.Errors.Any(e => e.Code is "DuplicateEmail" or "DuplicateUserName"))
                throw new Exception(MsgEmailDuplicado);
            throw new Exception(MsgEmailInvalidoLogin);
        }
    }

    public async Task GarantirCpfCnpjUnicoAsync(string? cpfCnpj, Guid? idAtual, CancellationToken cancellationToken)
    {
        if (cpfCnpj is null) return;
        var existe = await _repAssinante.AnyAsync(x => x.ASS_CPF_CNPJ == cpfCnpj && (idAtual == null || x.Id != idAtual), cancellationToken);
        if (existe) throw new Exception(MsgCpfCnpjDuplicado);
    }

    /// <summary>
    /// Cria o assinante (ativo) e o usuário de login com perfil Assinante. Sem <paramref name="senha"/> o usuário nasce sem senha
    /// (login só pelo provedor externo). Ordem: e-mail em uso, CPF/CNPJ repetido, assinante, usuário, login externo, perfil e dados iniciais.
    /// </summary>
    public async Task<(Assinante Assinante, Usuario Usuario)> CriarAsync(
        AssinanteCadastroDados dados, string? senha, LoginExternoDados? loginExterno, CancellationToken cancellationToken)
    {
        if (await EmailEmUsoAsync(dados.Email, null, cancellationToken))
            throw new Exception(MensagemEmailDuplicado(dados.Origem));
        await GarantirCpfCnpjUnicoAsync(dados.CpfCnpj, null, cancellationToken);

        var assinante = new Assinante
        {
            ASS_ATIVO = true,
            ASS_NOME = dados.Nome,
            ASS_CPF_CNPJ = dados.CpfCnpj,
            ASS_EMAIL = dados.Email,
            ASS_TELEFONE = dados.Telefone,
            ASS_ORIGEM = dados.Origem,
            ASS_TESTE_ATE = dados.TesteAte
        };
        await _repAssinante.InsertTransactionAsync(assinante, cancellationToken);

        var usuario = new Usuario
        {
            UserName = dados.Email,
            Email = dados.Email,
            EmailConfirmed = dados.EmailConfirmado,
            FullName = dados.Nome,
            Ativo = true,
            CreatedAt = DateTime.Now,
            ExigirTrocaSenha = dados.ExigirTrocaSenha,
            LockoutEnabled = true,
            AssinanteId = assinante.Id // o EF já atribuiu o Guid ao adicionar o assinante ao contexto
        };

        var criou = string.IsNullOrEmpty(senha)
            ? await _userManager.CreateAsync(usuario)
            : await _userManager.CreateAsync(usuario, senha);
        if (!criou.Succeeded)
            throw new Exception(TraduzirErros(criou, "Não foi possível criar o usuário de acesso.", dados.Origem));

        if (loginExterno is not null)
        {
            var ligou = await _userManager.AddLoginAsync(usuario, new UserLoginInfo(loginExterno.Provedor, loginExterno.Chave, loginExterno.Provedor));
            if (!ligou.Succeeded) throw new Exception("Não foi possível ligar a conta externa ao usuário de acesso.");
        }

        var comRole = await _userManager.AddToRoleAsync(usuario, RoleNames.Assinante);
        if (!comRole.Succeeded)
            throw new Exception(TraduzirErros(comRole, "Não foi possível definir o perfil do usuário de acesso.", dados.Origem));

        await _assinanteInicializacao.PrepararNovoAssinanteAsync(assinante.Id, cancellationToken);
        return (assinante, usuario);
    }
}
