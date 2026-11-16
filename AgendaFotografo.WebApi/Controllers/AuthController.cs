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
using AgendaFotografo.WebApi.Services.Emails;
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
    EmailsConta emailsConta, CodigoEmail codigos, FilaPedidoNovaSenha filaPedidoNovaSenha,
    ILogger<AuthController> logger) : AgendaFotografoController
{
    private readonly AssinanteCadastro _cadastro = cadastro;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly GoogleSettings _googleSettings = googleSettings;
    private readonly IGoogleTokenValidador _googleValidador = googleValidador;
    private readonly EmailsConta _emailsConta = emailsConta;
    private readonly CodigoEmail _codigos = codigos;
    private readonly FilaPedidoNovaSenha _filaPedidoNovaSenha = filaPedidoNovaSenha;

    private const string ProvedorGoogle = "Google";
    private const string MsgGoogleDesligado = "Entrar com Google não está disponível no momento.";
    private const string MsgGoogleTokenInvalido = "Não foi possível confirmar sua conta Google. Clique no botão do Google de novo.";
    private const string MsgGoogleEmailNaoVerificado = "O e-mail desta conta Google não está verificado. Use outra conta ou cadastre-se com e-mail e senha.";
    private const string MsgGoogleSemPermissao = "Esta conta não pode entrar com o Google. Entre com e-mail e senha.";
    private const string MsgGoogleOutraConta = "Este e-mail já está ligado a outra conta Google.";
    private const string MsgGoogleJaCadastrado = "Esta conta Google já tem cadastro. Entre pela aba Entrar.";
    private const string MsgAcessoIndisponivel = "Acesso indisponível. Procure o administrador do sistema.";
    private const string MsgEmailIndisponivel = "O envio de e-mails não está disponível no momento.";
    private const string MsgJaConfirmado = "Este e-mail já está confirmado. Entre com e-mail e senha.";
    private const string MsgCodigoIncorreto = "Código incorreto.";
    private const string MsgCodigoNaoVale = "Este código não vale mais. Peça um novo.";
    private const string MsgCodigoVenceu = "Este código venceu. Peça um novo.";
    private const string MsgCodigoOcupado = "Não foi possível conferir o código agora. Tente de novo.";
    private const string MsgJaTemSenha = "Sua conta já tem senha. Use Alterar senha.";
    private const string MsgUsuarioInativo = "Usuário inativo. Procure o administrador do sistema";
    private const string MsgEsqueciSenha = "Se este e-mail tiver cadastro com senha, enviamos um código. Se você entra com o Google, use o botão Entrar com Google.";
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

            var usuario = await ConferirSenhaAsync(model.Email, model.Password);
            var acesso = await ConferirAcessoAsync(usuario, cancellationToken);

            // Assinante com e-mail não confirmado (e-mail ligado): não emite token; manda código (respeitando os 60 s) e responde pendente
            if (PrecisaConfirmar(usuario, acesso.Role))
                return Ok(await ResponderPendenteAsync(usuario, cancellationToken));

            return Ok(await EmitirLoginAsync(usuario, cancellationToken, acesso));
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
    private async Task<LoginResponse> EmitirLoginAsync(Usuario usuario, CancellationToken cancellationToken, AcessoConferido? acessoConferido = null)
    {
        var acesso = acessoConferido ?? await ConferirAcessoAsync(usuario, cancellationToken);
        var role = acesso.Role;
        var assinanteNome = acesso.AssinanteNome;

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

    private record AcessoConferido(string Role, string? AssinanteNome);

    /// <summary>
    /// Bloqueio por tentativas e senha (regra única do Login e das actions do plano 18): usuário, lockout ANTES da senha, AccessFailed no
    /// erro e reset no acerto. Mensagens: "E-mail ou senha inválidos" e "Usuário bloqueado temporariamente".
    /// </summary>
    private async Task<Usuario> ConferirSenhaAsync(string email, string senha)
    {
        var usuario = await _userManager.FindByEmailAsync(email)
            ?? throw new Exception("E-mail ou senha inválidos");

        // Bloqueio por tentativas (5 erros = 15 min): checado ANTES de conferir a senha
        if (await _userManager.IsLockedOutAsync(usuario))
            throw new Exception("Usuário bloqueado temporariamente");

        if (!await _userManager.CheckPasswordAsync(usuario, senha))
        {
            await _userManager.AccessFailedAsync(usuario);
            if (await _userManager.IsLockedOutAsync(usuario))
                throw new Exception("Usuário bloqueado temporariamente");
            throw new Exception("E-mail ou senha inválidos");
        }

        await _userManager.ResetAccessFailedCountAsync(usuario);
        return usuario;
    }

    /// <summary>Confere Ativo, perfil e (para o Assinante) vínculo com assinante ativo. Devolve o perfil e o nome do assinante.</summary>
    private async Task<AcessoConferido> ConferirAcessoAsync(Usuario usuario, CancellationToken cancellationToken)
    {
        if (!usuario.Ativo)
            throw new Exception(MsgUsuarioInativo);

        var roles = await _userManager.GetRolesAsync(usuario);
        var role = roles.FirstOrDefault() ?? string.Empty;

        // Assinante só entra com vínculo a um assinante ATIVO; checado antes de emitir o token
        string? assinanteNome = null;
        if (role == RoleNames.Assinante)
            assinanteNome = await ObterNomeAssinanteAtivoAsync(usuario, cancellationToken);

        return new AcessoConferido(role, assinanteNome);
    }

    /// <summary>Só o Assinante com e-mail não confirmado passa pela confirmação, e só com o envio de e-mails ligado.</summary>
    private bool PrecisaConfirmar(Usuario usuario, string role)
        => _emailsConta.Ligado && role == RoleNames.Assinante && !usuario.EmailConfirmed;

    /// <summary>
    /// Resposta "confirmação pendente" (sem token). Se o último código tem menos de 60 s, não manda outro (o anterior ainda vale) e devolve
    /// o tempo que falta; senão gera e envia (síncrono, até 15 s).
    /// </summary>
    private async Task<LoginResponse> ResponderPendenteAsync(Usuario usuario, CancellationToken cancellationToken)
    {
        MarcarSemCache();
        var faltam = await _codigos.SegundosParaReenviarAsync(usuario, FinalidadeCodigo.Confirmacao);
        var envio = faltam > 0 ? new EnvioConfirmacao(false, faltam) : await _emailsConta.EnviarConfirmacaoAsync(usuario, cancellationToken);
        return Pendente(usuario, envio);
    }

    private static LoginResponse Pendente(Usuario usuario, EnvioConfirmacao envio) => new()
    {
        ConfirmacaoPendente = true,
        Email = usuario.Email ?? string.Empty,
        EnvioFalhou = envio.EnvioFalhou,
        ReenviarEmSegundos = envio.ReenviarEmSegundos
    };

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
            DiasGratis = TesteGratisRegra.ObterDiasGratis(_configuration),
            EmailLigado = _emailsConta.Ligado
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
                var confirmouAgora = false;
                if (!jaLigado)
                {
                    var ligou = await _userManager.AddLoginAsync(usuario, new UserLoginInfo(ProvedorGoogle, google.Sub, ProvedorGoogle));
                    if (!ligou.Succeeded) throw new Exception("Não foi possível ligar a conta Google. Tente novamente.");

                    // Conta com e-mail não confirmado: o dono do Google passa a ser o dono da conta; a senha antiga deixa de valer
                    if (!usuario.EmailConfirmed)
                    {
                        senhaRemovida |= await RemoverSenhaAsync(usuario);
                        usuario.EmailConfirmed = true;
                        confirmouAgora = true;
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

                // Conta de autocadastro que ficou pronta agora (e-mail não confirmado virou confirmado): boas-vindas em segundo plano
                if (confirmouAgora)
                    await _emailsConta.EnfileirarBoasVindasAsync(usuario, cancellationToken);
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

            // E-mail ligado e conta sem e-mail confirmado (cadastro manual): não emite o login; manda o código e responde pendente
            var pendente = _emailsConta.Ligado && !usuario.EmailConfirmed;
            _logger.LogInformation("Autocadastro concluído. AssinanteId={AssinanteId} Via={Via} ConfirmacaoPendente={ConfirmacaoPendente}",
                assinante.Id, via, pendente);

            if (pendente)
            {
                MarcarSemCache();
                return Ok(Pendente(usuario, await _emailsConta.EnviarConfirmacaoAsync(usuario, cancellationToken)));
            }

            var login = await EmitirLoginAsync(usuario, cancellationToken);
            MarcarSemCache();

            // Cadastro pelo Google: a conta já nasce pronta, então as boas-vindas saem agora
            if (usuario.EmailConfirmed)
                await _emailsConta.EnfileirarBoasVindasAsync(usuario, cancellationToken);
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

    // =====================================================================================================
    // E-mails de conta (plano 18): confirmação de e-mail, "Errei o e-mail" e "Esqueci minha senha"
    // Todas anônimas, com a política de rate limit "Cadastro" e sem cache. Logs só com UsuarioId e o resultado.
    // =====================================================================================================

    /// <summary>Confirma o e-mail com o código de 6 números. Código certo: confirma, dispara as boas-vindas e devolve o login.</summary>
    [AllowAnonymous]
    [EnableRateLimiting("Cadastro")]
    [HttpPost]
    public async Task<IActionResult> ConfirmarEmail([FromBody] ConfirmarEmailModel model, CancellationToken cancellationToken)
    {
        MarcarSemCache();
        if (model is null) return BadRequest("Dados inválidos.");
        if (!_emailsConta.Ligado) return BadRequest(MsgEmailIndisponivel);

        model.Email = AssinanteCadastro.NormalizarEmail(model.Email);
        model.Senha ??= string.Empty;
        model.Codigo = (model.Codigo ?? string.Empty).Trim();

        var error = ValidationHelper.ValidateModel(model, new ConfirmarEmailValidator());
        if (error is not null) return BadRequest(error);

        try
        {
            var usuario = await ConferirSenhaAsync(model.Email, model.Senha);
            var acesso = await ConferirAcessoAsync(usuario, cancellationToken);

            // Já confirmada (ou outro perfil): idempotente, só emite o login
            if (!PrecisaConfirmar(usuario, acesso.Role))
                return Ok(await EmitirLoginAsync(usuario, cancellationToken, acesso));

            var resultado = await _codigos.ConferirAsync(usuario, FinalidadeCodigo.Confirmacao, model.Codigo);
            if (resultado != ResultadoCodigo.Certo)
            {
                _logger.LogInformation("Confirmação de e-mail recusada. UsuarioId={UsuarioId} Resultado={Resultado}", usuario.Id, resultado);
                throw new Exception(MensagemCodigo(resultado));
            }

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                usuario.EmailConfirmed = true;
                var gravou = await _userManager.UpdateAsync(usuario);
                if (!gravou.Succeeded) throw new Exception("Não foi possível confirmar o e-mail. Tente de novo.");
                await _codigos.RemoverAsync(usuario);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                await _unitOfWork.CommitAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                throw;
            }

            _logger.LogInformation("E-mail confirmado. UsuarioId={UsuarioId}", usuario.Id);
            await _emailsConta.EnfileirarBoasVindasAsync(usuario, cancellationToken);
            return Ok(await EmitirLoginAsync(usuario, cancellationToken, acesso));
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Pede outro código de confirmação (libera 60 s depois do último envio bem-sucedido).</summary>
    [AllowAnonymous]
    [EnableRateLimiting("Cadastro")]
    [HttpPost]
    public async Task<IActionResult> ReenviarCodigo([FromBody] ReenviarCodigoModel model, CancellationToken cancellationToken)
    {
        MarcarSemCache();
        if (model is null) return BadRequest("Dados inválidos.");
        if (!_emailsConta.Ligado) return BadRequest(MsgEmailIndisponivel);

        model.Email = AssinanteCadastro.NormalizarEmail(model.Email);
        model.Senha ??= string.Empty;

        var error = ValidationHelper.ValidateModel(model, new ReenviarCodigoValidator());
        if (error is not null) return BadRequest(error);

        try
        {
            var usuario = await ConferirSenhaAsync(model.Email, model.Senha);
            var acesso = await ConferirAcessoAsync(usuario, cancellationToken);
            if (!PrecisaConfirmar(usuario, acesso.Role))
                throw new Exception(MsgJaConfirmado);

            var faltam = await _codigos.SegundosParaReenviarAsync(usuario, FinalidadeCodigo.Confirmacao);
            if (faltam > 0)
                throw new Exception($"Aguarde {faltam} segundos para pedir outro código.");

            var envio = await _emailsConta.EnviarConfirmacaoAsync(usuario, cancellationToken);
            return Ok(new CodigoEnvioResponse { Email = usuario.Email ?? string.Empty, EnvioFalhou = envio.EnvioFalhou, ReenviarEmSegundos = envio.ReenviarEmSegundos });
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>"Errei o e-mail": troca o e-mail de uma conta ainda não confirmada (exige a senha) e manda o código para o endereço novo.</summary>
    [AllowAnonymous]
    [EnableRateLimiting("Cadastro")]
    [HttpPost]
    public async Task<IActionResult> CorrigirEmail([FromBody] CorrigirEmailModel model, CancellationToken cancellationToken)
    {
        MarcarSemCache();
        if (model is null) return BadRequest("Dados inválidos.");
        if (!_emailsConta.Ligado) return BadRequest(MsgEmailIndisponivel);

        model.Email = AssinanteCadastro.NormalizarEmail(model.Email);
        model.EmailNovo = AssinanteCadastro.NormalizarEmail(model.EmailNovo);
        model.Senha ??= string.Empty;

        var error = ValidationHelper.ValidateModel(model, new CorrigirEmailValidator());
        if (error is not null) return BadRequest(error);

        var aberta = false;
        try
        {
            var usuario = await ConferirSenhaAsync(model.Email, model.Senha);
            var acesso = await ConferirAcessoAsync(usuario, cancellationToken);
            if (!PrecisaConfirmar(usuario, acesso.Role))
                throw new Exception(MsgJaConfirmado);

            if (string.Equals(usuario.Email, model.EmailNovo, StringComparison.OrdinalIgnoreCase))
                throw new Exception("Este já é o e-mail da conta.");
            if (await _cadastro.EmailEmUsoAsync(model.EmailNovo, usuario.Id, cancellationToken))
                throw new Exception(AssinanteCadastro.MsgEmailDuplicadoAutocadastro);
            await _cadastro.ValidarLoginIdentityAsync(usuario.Id, model.EmailNovo);

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            aberta = true;

            // Troca o login junto, sem SetEmailAsync (ele zeraria EmailConfirmed e renovaria o SecurityStamp), como o Atualizar do Admin
            usuario.Email = model.EmailNovo;
            usuario.UserName = model.EmailNovo;
            usuario.NormalizedEmail = _userManager.NormalizeEmail(model.EmailNovo);
            usuario.NormalizedUserName = _userManager.NormalizeName(model.EmailNovo);
            var gravou = await _userManager.UpdateAsync(usuario);
            if (!gravou.Succeeded) throw new Exception(AssinanteCadastro.TraduzirErros(gravou, "Não foi possível trocar o e-mail. Tente de novo.", OrigemAssinante.Autocadastro));

            var assinante = await _db.Assinantes.FirstOrDefaultAsync(a => a.Id == usuario.AssinanteId, cancellationToken)
                ?? throw new Exception(MsgAcessoIndisponivel);
            assinante.ASS_EMAIL = model.EmailNovo;

            await _codigos.RemoverAsync(usuario, FinalidadeCodigo.Confirmacao);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);
            aberta = false;

            _logger.LogInformation("E-mail da conta corrigido. UsuarioId={UsuarioId} AssinanteId={AssinanteId}", usuario.Id, assinante.Id);

            // Endereço novo: envia na hora, sem esperar os 60 s
            var envio = await _emailsConta.EnviarConfirmacaoAsync(usuario, cancellationToken);
            return Ok(new CodigoEnvioResponse { Email = usuario.Email ?? string.Empty, EnvioFalhou = envio.EnvioFalhou, ReenviarEmSegundos = envio.ReenviarEmSegundos });
        }
        catch (DbUpdateException ex)
        {
            if (aberta) await _unitOfWork.RollbackAsync(cancellationToken);
            var duplicidade = AssinanteCadastro.EhDuplicidade(ex);
            if (!duplicidade)
                _logger.LogError(ex, "Falha ao corrigir o e-mail da conta.");
            return BadRequest(duplicidade ? AssinanteCadastro.MsgEmailDuplicadoAutocadastro : "Não foi possível trocar o e-mail. Tente de novo.");
        }
        catch (Exception ex)
        {
            if (aberta) await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// "Esqueci minha senha": responde SEMPRE o mesmo 200 para qualquer e-mail de formato válido. O código só vai (pela fila) para Assinante
    /// com senha e sem pedido nos últimos 60 s; vale também para conta inativa, assinante bloqueado ou conta não confirmada.
    /// </summary>
    [AllowAnonymous]
    [EnableRateLimiting("Cadastro")]
    [HttpPost]
    public async Task<IActionResult> EsqueciSenha([FromBody] EsqueciSenhaModel model, CancellationToken cancellationToken)
    {
        MarcarSemCache();
        if (model is null) return BadRequest("Dados inválidos.");
        if (!_emailsConta.Ligado) return BadRequest(MsgEmailIndisponivel);

        model.Email = AssinanteCadastro.NormalizarEmail(model.Email);
        var error = ValidationHelper.ValidateModel(model, new EsqueciSenhaValidator());
        if (error is not null) return BadRequest(error);

        // Só enfileira: a busca do usuário, as regras e o envio acontecem em segundo plano (tempo de resposta igual para qualquer e-mail)
        _filaPedidoNovaSenha.Enfileirar(model.Email);

        return Ok(new ApiResponse { Success = true, Message = MsgEsqueciSenha });
    }

    /// <summary>
    /// Cria a senha nova com o código. Troca a senha, confirma o e-mail, zera ExigirTrocaSenha e o bloqueio por tentativas, remove os dois
    /// códigos e só então emite o login. Funciona com o assinante bloqueado, mas o login continua recusado ("Senha alterada. " + mensagem).
    /// </summary>
    [AllowAnonymous]
    [EnableRateLimiting("Cadastro")]
    [HttpPost]
    public async Task<IActionResult> RedefinirSenha([FromBody] RedefinirSenhaModel model, CancellationToken cancellationToken)
    {
        MarcarSemCache();
        if (model is null) return BadRequest("Dados inválidos.");
        if (!_emailsConta.Ligado) return BadRequest(MsgEmailIndisponivel);

        model.Email = AssinanteCadastro.NormalizarEmail(model.Email);
        model.Codigo = (model.Codigo ?? string.Empty).Trim();
        model.NovaSenha ??= string.Empty;

        var error = ValidationHelper.ValidateModel(model, new RedefinirSenhaValidator());
        if (error is not null) return BadRequest(error);

        var aberta = false;
        try
        {
            var usuario = await _userManager.FindByEmailAsync(model.Email);
            if (usuario is null
                || !await _userManager.IsInRoleAsync(usuario, RoleNames.Assinante)
                || !await _userManager.HasPasswordAsync(usuario))
                throw new Exception(MsgCodigoIncorreto);

            var resultado = await _codigos.ConferirAsync(usuario, FinalidadeCodigo.NovaSenha, model.Codigo);
            if (resultado != ResultadoCodigo.Certo)
            {
                _logger.LogInformation("Nova senha recusada. UsuarioId={UsuarioId} Resultado={Resultado}", usuario.Id, resultado);
                throw new Exception(MensagemCodigo(resultado));
            }

            var jaConfirmado = usuario.EmailConfirmed;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            aberta = true;

            usuario.EmailConfirmed = true;
            usuario.ExigirTrocaSenha = false;

            // ResetPasswordAsync grava a senha nova e as duas propriedades acima (mesma entidade rastreada)
            var token = await _userManager.GeneratePasswordResetTokenAsync(usuario);
            var redefiniu = await _userManager.ResetPasswordAsync(usuario, token, model.NovaSenha);
            if (!redefiniu.Succeeded)
                throw new Exception(AssinanteCadastro.TraduzirErros(redefiniu, "Não foi possível criar a nova senha. Tente de novo."));

            // Zera o bloqueio por tentativas (SetLockoutEndDateAsync exige o lockout habilitado)
            if (!usuario.LockoutEnabled)
            {
                var habilitou = await _userManager.SetLockoutEnabledAsync(usuario, true);
                if (!habilitou.Succeeded) throw new Exception("Não foi possível criar a nova senha. Tente de novo.");
            }
            var zerou = await _userManager.ResetAccessFailedCountAsync(usuario);
            if (!zerou.Succeeded) throw new Exception("Não foi possível criar a nova senha. Tente de novo.");
            var liberou = await _userManager.SetLockoutEndDateAsync(usuario, null);
            if (!liberou.Succeeded) throw new Exception("Não foi possível criar a nova senha. Tente de novo.");

            await _codigos.RemoverAsync(usuario);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);
            aberta = false;

            _logger.LogInformation("Senha redefinida por código. UsuarioId={UsuarioId} ConfirmouEmail={ConfirmouEmail}", usuario.Id, !jaConfirmado);

            try
            {
                var login = await EmitirLoginAsync(usuario, cancellationToken);
                // Boas-vindas só depois de o login ser emitido (usuário inativo ou assinante bloqueado não recebe)
                if (!jaConfirmado)
                    await _emailsConta.EnfileirarBoasVindasAsync(usuario, cancellationToken);
                return Ok(login);
            }
            catch (Exception ex) when (ex.GetType() == typeof(Exception) && ex.InnerException is null)
            {
                // A senha já mudou: o acesso recusado (usuário inativo, assinante bloqueado) vem avisando disso
                throw new Exception("Senha alterada. " + ex.Message);
            }
        }
        catch (Exception ex)
        {
            if (aberta) await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// Travas comuns de SolicitarCodigoDefinirSenha e DefinirSenha, nesta ordem: e-mail ligado, usuário ativo e conta sem senha.
    /// Devolve o usuário logado (lido do banco pelo Id do token).
    /// </summary>
    private async Task<Usuario> ObterUsuarioSemSenhaAsync()
    {
        if (!_emailsConta.Ligado) throw new Exception(MsgEmailIndisponivel);

        var usuario = await _userManager.FindByIdAsync(_currentUser.UserIdentity.Id)
            ?? throw new Exception("Usuário não encontrado");
        if (!usuario.Ativo) throw new Exception(MsgUsuarioInativo);
        if (await _userManager.HasPasswordAsync(usuario)) throw new Exception(MsgJaTemSenha);
        return usuario;
    }

    /// <summary>
    /// Plano 19: manda ao e-mail da conta um código de 6 números para quem entrou só pelo Google definir uma senha de acesso.
    /// Libera 60 s depois do último envio bem-sucedido. Falha de envio não é erro HTTP: responde 200 com EnvioFalhou = true.
    /// </summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> SolicitarCodigoDefinirSenha(CancellationToken cancellationToken)
    {
        MarcarSemCache();
        try
        {
            var usuario = await ObterUsuarioSemSenhaAsync();

            var faltam = await _codigos.SegundosParaReenviarAsync(usuario, FinalidadeCodigo.DefinirSenha);
            if (faltam > 0)
                throw new Exception($"Aguarde {faltam} segundos para pedir outro código.");

            var envio = await _emailsConta.EnviarDefinirSenhaAsync(usuario, cancellationToken);
            return Ok(new CodigoEnvioResponse { Email = usuario.Email ?? string.Empty, EnvioFalhou = envio.EnvioFalhou, ReenviarEmSegundos = envio.ReenviarEmSegundos });
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// Plano 19: define a primeira senha da conta (sem senha) com o código recebido por e-mail. Só com o código certo, numa transação:
    /// adiciona a senha, remove o código e zera as falhas de login. Não mexe em ExigirTrocaSenha, EmailConfirmed nem no vínculo Google.
    /// </summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> DefinirSenha([FromBody] DefinirSenhaModel model, CancellationToken cancellationToken)
    {
        MarcarSemCache();
        if (model is null) return BadRequest("Dados inválidos.");

        var aberta = false;
        try
        {
            var usuario = await ObterUsuarioSemSenhaAsync();

            model.Codigo = (model.Codigo ?? string.Empty).Trim();
            model.NovaSenha ??= string.Empty;

            var error = ValidationHelper.ValidateModel(model, new DefinirSenhaValidator());
            if (error is not null) return BadRequest(error);

            var resultado = await _codigos.ConferirAsync(usuario, FinalidadeCodigo.DefinirSenha, model.Codigo);
            if (resultado != ResultadoCodigo.Certo)
            {
                _logger.LogInformation("Definir senha recusado. UsuarioId={UsuarioId} Resultado={Resultado}", usuario.Id, resultado);
                throw new Exception(MensagemCodigo(resultado));
            }

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            aberta = true;

            var adicionou = await _userManager.AddPasswordAsync(usuario, model.NovaSenha);
            if (!adicionou.Succeeded)
            {
                var mensagens = adicionou.Errors.Select(e => e.Code switch
                {
                    "PasswordTooShort" => "A senha deve ter no mínimo 8 caracteres",
                    "PasswordRequiresUpper" => "A senha deve conter ao menos uma letra maiúscula",
                    "PasswordRequiresLower" => "A senha deve conter ao menos uma letra minúscula",
                    "PasswordRequiresDigit" => "A senha deve conter ao menos um número",
                    "PasswordRequiresNonAlphanumeric" => "A senha deve conter ao menos um caractere especial",
                    _ => "Não foi possível definir a senha"
                }).Distinct();
                throw new Exception(string.Join("\n", mensagens));
            }

            var zerou = await _userManager.ResetAccessFailedCountAsync(usuario);
            if (!zerou.Succeeded) throw new Exception("Não foi possível definir a senha");

            await _codigos.RemoverAsync(usuario, FinalidadeCodigo.DefinirSenha);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);
            aberta = false;

            _logger.LogInformation("Senha de acesso definida por código. UsuarioId={UsuarioId}", usuario.Id);
            return Ok(new ApiResponse { Success = true, Message = "Senha definida. Agora você também pode entrar com e-mail e senha." });
        }
        catch (Exception ex)
        {
            if (aberta) await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    private static string MensagemCodigo(ResultadoCodigo resultado) => resultado switch
    {
        ResultadoCodigo.Incorreto => MsgCodigoIncorreto,
        ResultadoCodigo.Venceu => MsgCodigoVenceu,
        ResultadoCodigo.Ocupado => MsgCodigoOcupado,
        _ => MsgCodigoNaoVale
    };

    /// <summary>Respostas com token nunca podem ser guardadas em cache.</summary>
    private void MarcarSemCache()
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers.Pragma = "no-cache";
    }
}
