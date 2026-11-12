using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AgendaFotografo.CrossCutting.Services.Google;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.Infra.Data.Context;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Auth;
using AgendaFotografo.WebApi.Services.Assinantes;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Validators.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TesteGratisRegra = AgendaFotografo.WebApi.Services.Assinantes.TesteGratis;

namespace AgendaFotografo.WebApi.Controllers;

public class AuthController(UserManager<Usuario> userManager, IConfiguration configuration, ICurrentUser currentUser, EfDbContext db,
    AssinanteCadastro cadastro, AssinanteEscopo assinanteEscopo, IUnitOfWork unitOfWork,
    GoogleSettings googleSettings, IGoogleTokenValidador googleValidador,
    ILogger<AuthController> logger) : AgendaFotografoController
{
    private readonly AssinanteCadastro _cadastro = cadastro;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly GoogleSettings _googleSettings = googleSettings;
    private readonly IGoogleTokenValidador _googleValidador = googleValidador;

    private const string ProvedorGoogle = "Google";
    private const string MsgGoogleDesligado = "Entrar com Google não está disponível no momento.";
    private const string MsgGoogleTokenInvalido = "Não foi possível confirmar sua conta Google. Clique no botão do Google de novo.";
    private const string MsgGoogleEmailNaoVerificado = "O e-mail desta conta Google não está verificado. Use outra conta ou cadastre-se com e-mail e senha.";
    private const string MsgGoogleSemPermissao = "Esta conta não pode entrar com o Google. Entre com e-mail e senha.";
    private const string MsgGoogleOutraConta = "Este e-mail já está ligado a outra conta Google.";
    private const string MsgGoogleJaCadastrado = "Esta conta Google já tem cadastro. Entre pela aba Entrar.";
    private const string MsgAcessoIndisponivel = "Acesso indisponível. Procure o administrador do sistema.";
    private readonly ILogger<AuthController> _logger = logger;
    private readonly EfDbContext _db = db;
    private readonly ICurrentUser _currentUser = currentUser;
    private readonly UserManager<Usuario> _userManager = userManager;
    private readonly IConfiguration _configuration = configuration;

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> Login([FromBody] LoginModel model, CancellationToken cancellationToken)
    {
        try
        {
            var error = ValidationHelper.ValidateModel(model, new LoginValidator());
            if (error is not null) return BadRequest(error);

            var usuario = await _userManager.FindByEmailAsync(model.Email)
                ?? throw new Exception("E-mail ou senha inválidos");

            // Bloqueio por tentativas (5 erros = 15 min): checado ANTES de conferir a senha
            if (await _userManager.IsLockedOutAsync(usuario))
                throw new Exception("Usuário bloqueado temporariamente");

            if (!await _userManager.CheckPasswordAsync(usuario, model.Password))
            {
                await _userManager.AccessFailedAsync(usuario);
                if (await _userManager.IsLockedOutAsync(usuario))
                    throw new Exception("Usuário bloqueado temporariamente");
                throw new Exception("E-mail ou senha inválidos");
            }

            await _userManager.ResetAccessFailedCountAsync(usuario);

            return Ok(await EmitirLoginAsync(usuario, cancellationToken));
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// Emite o login de um usuário já autenticado (senha conferida ou token do Google validado): confere Ativo, perfil e vínculo com
    /// assinante ativo, grava LastLogin, gera o JWT e monta o <see cref="LoginResponse"/>. Usado por todas as actions que devolvem token.
    /// </summary>
    private async Task<LoginResponse> EmitirLoginAsync(Usuario usuario, CancellationToken cancellationToken)
    {
        if (!usuario.Ativo)
            throw new Exception("Usuário inativo. Procure o administrador do sistema");

        var roles = await _userManager.GetRolesAsync(usuario);
        var role = roles.FirstOrDefault() ?? string.Empty;

        // Assinante só entra com vínculo a um assinante ATIVO; checado antes de emitir o token
        string? assinanteNome = null;
        if (role == RoleNames.Assinante)
            assinanteNome = await ObterNomeAssinanteAtivoAsync(usuario, cancellationToken);

        usuario.LastLogin = DateTime.Now;
        await _userManager.UpdateAsync(usuario);

        var horas = _configuration.GetValue("Jwt:ExpiraEmHoras", 8);
        var expiraEm = DateTime.UtcNow.AddHours(horas);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id),
            new(ClaimTypes.Name, usuario.FullName),
            new(ClaimTypes.Email, usuario.Email ?? string.Empty),
            new(ClaimTypes.Role, role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Setup.ObterJwtKey(_configuration)));
        var token = new JwtSecurityToken(
            claims: claims,
            expires: expiraEm,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new LoginResponse
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            ExpiraEm = expiraEm,
            Id = usuario.Id,
            FullName = usuario.FullName,
            Email = usuario.Email ?? string.Empty,
            Role = role,
            ExigirTrocaSenha = usuario.ExigirTrocaSenha,
            AssinanteNome = assinanteNome,
            TemSenha = await _userManager.HasPasswordAsync(usuario)
        };
    }

    /// <summary>Nome do assinante ativo vinculado ao usuário; sem vínculo ou com o assinante inativo = "Acesso indisponível".</summary>
    private async Task<string> ObterNomeAssinanteAtivoAsync(Usuario usuario, CancellationToken cancellationToken)
    {
        var vinculo = usuario.AssinanteId is null ? null
            : await _db.Assinantes.AsNoTracking().Where(a => a.Id == usuario.AssinanteId && a.ASS_ATIVO)
                .Select(a => new { a.ASS_NOME }).FirstOrDefaultAsync(cancellationToken);
        if (vinculo is null)
            throw new Exception(MsgAcessoIndisponivel);
        return vinculo.ASS_NOME;
    }

    /// <summary>Altera a senha do próprio usuário logado. O token atual continua válido (o JWT não valida o SecurityStamp).</summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> AlterarSenha([FromBody] AlterarSenhaModel model, CancellationToken cancellationToken)
    {
        try
        {
            var error = ValidationHelper.ValidateModel(model, new AlterarSenhaValidator());
            if (error is not null) return BadRequest(error);

            var usuario = await _userManager.FindByIdAsync(_currentUser.UserIdentity.Id)
                ?? throw new Exception("Usuário não encontrado");

            if (!usuario.Ativo)
                throw new Exception("Usuário inativo. Procure o administrador do sistema");

            if (!await _userManager.HasPasswordAsync(usuario))
                throw new Exception("Sua conta entra pelo Google e não tem senha para alterar.");

            var result = await _userManager.ChangePasswordAsync(usuario, model.SenhaAtual, model.NovaSenha);
            if (!result.Succeeded)
            {
                var mensagens = result.Errors.Select(e => e.Code switch
                {
                    "PasswordMismatch" => "Senha atual incorreta",
                    "PasswordTooShort" => "A senha deve ter no mínimo 8 caracteres",
                    "PasswordRequiresUpper" => "A senha deve conter ao menos uma letra maiúscula",
                    "PasswordRequiresLower" => "A senha deve conter ao menos uma letra minúscula",
                    "PasswordRequiresDigit" => "A senha deve conter ao menos um número",
                    "PasswordRequiresNonAlphanumeric" => "A senha deve conter ao menos um caractere especial",
                    _ => "Não foi possível alterar a senha"
                }).Distinct();
                return BadRequest(string.Join("\n", mensagens));
            }

            if (usuario.ExigirTrocaSenha)
            {
                usuario.ExigirTrocaSenha = false;
                var gravou = await _userManager.UpdateAsync(usuario);
                if (!gravou.Succeeded)
                    throw new Exception("Senha alterada, mas não foi possível concluir o registro da troca. Entre novamente com a nova senha.");
            }

            return Ok(new ApiResponse { Success = true, Message = "Senha alterada com sucesso" });
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    // =====================================================================================================
    // Autocadastro (teste grátis) e configuração da tela de login
    // =====================================================================================================

    /// <summary>Configuração pública da tela de login (Client ID do Google e dias grátis). Não acessa o banco.</summary>
    [AllowAnonymous]
    [HttpGet]
    public IActionResult ConfiguracaoLogin()
    {
        return Ok(new ConfiguracaoLoginResponse
        {
            GoogleClientId = _googleSettings.Ligado ? _googleSettings.ClientId : null,
            DiasGratis = TesteGratisRegra.ObterDiasGratis(_configuration)
        });
    }

    /// <summary>Autocadastro com e-mail e senha: cria assinante + usuário numa transação e já devolve o login.</summary>
    [AllowAnonymous]
    [EnableRateLimiting("Cadastro")]
    [HttpPost]
    public async Task<IActionResult> Cadastrar([FromBody] CadastroModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        model.ASS_NOME = (model.ASS_NOME ?? string.Empty).Trim();
        model.ASS_EMAIL = AssinanteCadastro.NormalizarEmail(model.ASS_EMAIL);
        model.ASS_TELEFONE = AssinanteCadastro.SomenteDigitosOuNulo(model.ASS_TELEFONE) ?? string.Empty;
        model.ASS_CPF_CNPJ = AssinanteCadastro.SomenteDigitosOuNulo(model.ASS_CPF_CNPJ) ?? string.Empty;
        model.Senha ??= string.Empty;

        var error = ValidationHelper.ValidateModel(model, new CadastroValidator());
        if (error is not null) return BadRequest(error);

        return await CriarAutocadastroAsync(new AssinanteCadastroDados
        {
            Nome = model.ASS_NOME,
            Email = model.ASS_EMAIL,
            Telefone = model.ASS_TELEFONE,
            CpfCnpj = model.ASS_CPF_CNPJ,
            Origem = OrigemAssinante.Autocadastro,
            EmailConfirmado = false,
            ExigirTrocaSenha = false
        }, model.Senha, null, "senha", cancellationToken);
    }

    /// <summary>Dias restantes do teste grátis do assinante logado (o cabeçalho do SPA chama uma vez ao montar).</summary>
    [Authorize(Roles = RoleNames.Assinante)]
    [HttpGet]
    public async Task<IActionResult> TesteGratis(CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);
            var testeAte = await _db.Assinantes.AsNoTracking().Where(a => a.Id == assinanteId)
                .Select(a => a.ASS_TESTE_ATE).FirstOrDefaultAsync(cancellationToken);

            MarcarSemCache();
            return Ok(new TesteGratisResponse
            {
                ASS_TESTE_ATE = testeAte,
                DiasRestantes = TesteGratisRegra.DiasRestantes(testeAte, DateOnly.FromDateTime(DateTime.Now))
            });
        }
        catch (AssinanteSemVinculoException)
        {
            return StatusCode(403, AssinanteEscopo.MensagemSemVinculo);
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    // =====================================================================================================
    // Login e cadastro com Google (o ID token é validado sempre aqui, com Audience = Google:ClientId)
    // =====================================================================================================

    /// <summary>
    /// Entra com o Google. Se o e-mail já tem cadastro de Assinante, liga o Google à conta (nunca cria segunda conta) e emite o login;
    /// se não tem, devolve <c>PrecisaCompletar</c> sem gravar nada.
    /// </summary>
    [AllowAnonymous]
    [EnableRateLimiting("Cadastro")]
    [HttpPost]
    public async Task<IActionResult> LoginGoogle([FromBody] LoginGoogleModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");
        MarcarSemCache();

        var aberta = false;
        try
        {
            var google = await ValidarGoogleAsync(model.IdToken);

            // Procura pelo login do Google e, se não achar, pelo e-mail do token
            var usuario = await _userManager.FindByLoginAsync(ProvedorGoogle, google.Sub);
            var jaLigado = usuario is not null;
            usuario ??= await _userManager.FindByEmailAsync(google.Email);

            if (usuario is null)
                return Ok(new LoginGoogleResponse { PrecisaCompletar = true, Nome = google.Nome, Email = google.Email });

            // Só o perfil Assinante entra com o Google (o Admin nunca é ligado)
            if (!await _userManager.IsInRoleAsync(usuario, RoleNames.Assinante))
                throw new Exception(MsgGoogleSemPermissao);

            if (!jaLigado)
            {
                var logins = await _userManager.GetLoginsAsync(usuario);
                if (logins.Any(l => l.LoginProvider == ProvedorGoogle))
                    throw new Exception(MsgGoogleOutraConta);
            }

            // Acesso conferido ANTES de gravar qualquer coisa (o bloqueio por senha não vale para o Google)
            if (!usuario.Ativo)
                throw new Exception("Usuário inativo. Procure o administrador do sistema");
            await ObterNomeAssinanteAtivoAsync(usuario, cancellationToken);

            var precisaGravar = !jaLigado || usuario.ExigirTrocaSenha;
            if (precisaGravar)
            {
                await _unitOfWork.BeginTransactionAsync(cancellationToken);
                aberta = true;

                var senhaRemovida = false;
                if (!jaLigado)
                {
                    var ligou = await _userManager.AddLoginAsync(usuario, new UserLoginInfo(ProvedorGoogle, google.Sub, ProvedorGoogle));
                    if (!ligou.Succeeded) throw new Exception("Não foi possível ligar a conta Google. Tente novamente.");

                    // Conta com e-mail não confirmado: o dono do Google passa a ser o dono da conta; a senha antiga deixa de valer
                    if (!usuario.EmailConfirmed)
                    {
                        senhaRemovida |= await RemoverSenhaAsync(usuario);
                        usuario.EmailConfirmed = true;
                    }
                }

                // Senha temporária do Admin deixa de valer e a troca obrigatória deixa de existir
                if (usuario.ExigirTrocaSenha)
                {
                    senhaRemovida |= await RemoverSenhaAsync(usuario);
                    usuario.ExigirTrocaSenha = false;
                }

                var gravou = await _userManager.UpdateAsync(usuario);
                if (!gravou.Succeeded) throw new Exception("Não foi possível concluir o login com o Google. Tente novamente.");

                await _unitOfWork.SaveChangesAsync(cancellationToken);
                await _unitOfWork.CommitAsync(cancellationToken);
                aberta = false;

                _logger.LogInformation("Login Google gravou alterações. UsuarioId={UsuarioId} Ligou={Ligou} SenhaRemovida={SenhaRemovida}", usuario.Id, !jaLigado, senhaRemovida);
            }

            var login = await EmitirLoginAsync(usuario, cancellationToken);
            return Ok(new LoginGoogleResponse { PrecisaCompletar = false, Login = login });
        }
        catch (Exception ex)
        {
            if (aberta) await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Cria a conta depois do Google: nome, telefone e CPF/CNPJ vêm do formulário; o e-mail vem sempre do token.</summary>
    [AllowAnonymous]
    [EnableRateLimiting("Cadastro")]
    [HttpPost]
    public async Task<IActionResult> CadastrarGoogle([FromBody] CadastroGoogleModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");
        MarcarSemCache();

        GoogleIdentidade google;
        try
        {
            google = await ValidarGoogleAsync(model.IdToken);
            if (await _userManager.FindByLoginAsync(ProvedorGoogle, google.Sub) is not null)
                throw new Exception(MsgGoogleJaCadastrado);
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }

        model.ASS_NOME = (model.ASS_NOME ?? string.Empty).Trim();
        model.ASS_TELEFONE = AssinanteCadastro.SomenteDigitosOuNulo(model.ASS_TELEFONE) ?? string.Empty;
        model.ASS_CPF_CNPJ = AssinanteCadastro.SomenteDigitosOuNulo(model.ASS_CPF_CNPJ) ?? string.Empty;

        var error = ValidationHelper.ValidateModel(model, new CadastroGoogleValidator());
        if (error is not null) return BadRequest(error);

        return await CriarAutocadastroAsync(new AssinanteCadastroDados
        {
            Nome = model.ASS_NOME,
            Email = google.Email,
            Telefone = model.ASS_TELEFONE,
            CpfCnpj = model.ASS_CPF_CNPJ,
            Origem = OrigemAssinante.Autocadastro,
            EmailConfirmado = true,
            ExigirTrocaSenha = false
        }, null, new LoginExternoDados(ProvedorGoogle, google.Sub), "google", cancellationToken);
    }

    /// <summary>Checagens comuns às duas actions do Google, nesta ordem: desligado, token inválido ou vencido, e-mail não verificado.</summary>
    private async Task<GoogleIdentidade> ValidarGoogleAsync(string? idToken)
    {
        if (!_googleSettings.Ligado) throw new Exception(MsgGoogleDesligado);

        if (string.IsNullOrWhiteSpace(idToken) || idToken.Length > 4096)
            throw new Exception(MsgGoogleTokenInvalido);
        var google = await _googleValidador.ValidarAsync(idToken) ?? throw new Exception(MsgGoogleTokenInvalido);

        if (!google.EmailVerificado) throw new Exception(MsgGoogleEmailNaoVerificado);
        return google;
    }

    /// <summary>Remove a senha da conta, se houver. Devolve verdadeiro quando removeu.</summary>
    private async Task<bool> RemoverSenhaAsync(Usuario usuario)
    {
        if (!await _userManager.HasPasswordAsync(usuario)) return false;
        var removeu = await _userManager.RemovePasswordAsync(usuario);
        if (!removeu.Succeeded) throw new Exception("Não foi possível concluir o login com o Google. Tente novamente.");
        return true;
    }

    /// <summary>
    /// Cria o autocadastro numa única transação (assinante, usuário, perfil, login externo e tipos de evento padrão) e devolve o login.
    /// Qualquer falha desfaz tudo. O log traz só o AssinanteId e a via (nunca senha, e-mail, CPF/CNPJ, telefone ou token).
    /// </summary>
    private async Task<IActionResult> CriarAutocadastroAsync(AssinanteCadastroDados dados, string? senha, LoginExternoDados? loginExterno,
        string via, CancellationToken cancellationToken)
    {
        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            dados.TesteAte = TesteGratisRegra.CalcularTesteAte(
                DateOnly.FromDateTime(DateTime.Now), TesteGratisRegra.ObterDiasGratis(_configuration));

            var (assinante, usuario) = await _cadastro.CriarAsync(dados, senha, loginExterno, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            _logger.LogInformation("Autocadastro concluído. AssinanteId={AssinanteId} Via={Via}", assinante.Id, via);

            var login = await EmitirLoginAsync(usuario, cancellationToken);
            MarcarSemCache();
            return Ok(login);
        }
        catch (DbUpdateException ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            var duplicidade = AssinanteCadastro.EhDuplicidade(ex);
            if (!duplicidade)
                _logger.LogError(ex, "Falha ao gravar autocadastro.");
            return BadRequest(duplicidade ? AssinanteCadastro.MsgEmailDuplicadoAutocadastro
                : "Não foi possível criar a conta. Tente novamente.");
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Respostas com token nunca podem ser guardadas em cache.</summary>
    private void MarcarSemCache()
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers.Pragma = "no-cache";
    }
}
