using System.Text.RegularExpressions;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.Infra.Data.Context;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Assinantes;
using AgendaFotografo.WebApi.Services.Assinantes;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Security;
using AgendaFotografo.WebApi.Validators.Assinante;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Gestão de assinantes (back-office, só Admin). Criar grava o assinante e o usuário de login (perfil Assinante, senha temporária)
/// na mesma transação: UserManager, IBaseRepository e IUnitOfWork usam o MESMO EfDbContext scoped. Não há exclusão: só Inativar/Ativar.
/// </summary>
[Authorize(Roles = RoleNames.Admin)]
public class AssinanteController(
    IBaseRepository<Assinante> repAssinante,
    IUnitOfWork unitOfWork,
    UserManager<Usuario> userManager,
    EfDbContext db,
    SessaoUsuarioCache sessaoCache,
    ICurrentUser currentUser,
    AssinanteCadastro cadastro,
    ILogger<AssinanteController> logger) : AgendaFotografoController
{
    private readonly IBaseRepository<Assinante> _repAssinante = repAssinante;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly UserManager<Usuario> _userManager = userManager;
    private readonly EfDbContext _db = db;
    private readonly SessaoUsuarioCache _sessaoCache = sessaoCache;
    private readonly ICurrentUser _currentUser = currentUser;
    private readonly AssinanteCadastro _cadastro = cadastro;
    private readonly ILogger<AssinanteController> _logger = logger;

    private const int PageSizeMaximo = 100;

    private const string MsgIdObrigatorio = "Id é obrigatório";
    private const string MsgNaoEncontrado = "Assinante não encontrado";
    private const string MsgEmailDuplicado = AssinanteCadastro.MsgEmailDuplicado;
    private const string MsgSemUsuario = "Assinante sem usuário de acesso.";
    private const string MsgFalhaGravar = "Não foi possível salvar o assinante. Tente novamente.";

    // =====================================================================================================
    // Consultas
    // =====================================================================================================

    /// <summary>Lista paginada. Ativo: "true" (padrão, só ativos), "false" (só bloqueados) ou "todos"; outro valor = 400.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken, int page = 1, int pageSize = 25,
        string? busca = null, string? ativo = "true")
    {
        try
        {
            page = Math.Max(page, 1);
            pageSize = pageSize < 1 ? 25 : Math.Min(pageSize, PageSizeMaximo);

            bool? filtroAtivo;
            if (string.IsNullOrWhiteSpace(ativo))
                filtroAtivo = true;
            else if (ativo.Trim().Equals("todos", StringComparison.OrdinalIgnoreCase))
                filtroAtivo = null;
            else if (bool.TryParse(ativo.Trim(), out var valorAtivo))
                filtroAtivo = valorAtivo;
            else
                throw new Exception("Filtro de status inválido");

            var assinantes = _repAssinante.SelectContext().AsNoTracking();

            if (filtroAtivo is not null)
                assinantes = assinantes.Where(x => x.ASS_ATIVO == filtroAtivo.Value);

            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim();
                // Só busca por CPF/CNPJ quando o termo, sem pontuação/espaços (. / - espaço), tem apenas dígitos
                var semPontuacao = Regex.Replace(termo, @"[.\-/\s]", "");
                var soDigitos = semPontuacao.Length > 0 && semPontuacao.All(char.IsAsciiDigit);
                if (soDigitos)
                    assinantes = assinantes.Where(x =>
                        x.ASS_NOME.Contains(termo) ||
                        x.ASS_EMAIL.Contains(termo) ||
                        (x.ASS_CPF_CNPJ != null && x.ASS_CPF_CNPJ.Contains(semPontuacao)));
                else
                    assinantes = assinantes.Where(x => x.ASS_NOME.Contains(termo) || x.ASS_EMAIL.Contains(termo));
            }

            // Left join com o usuário de login do assinante (ExigirTrocaSenha e LastLogin)
            var query = from a in assinantes
                        from u in _db.Users.AsNoTracking().Where(x => x.AssinanteId == a.Id).DefaultIfEmpty()
                        select new { a, u };

            var total = await query.CountAsync(cancellationToken);
            var dados = await query
                .OrderBy(x => x.a.ASS_NOME).ThenBy(x => x.a.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new AssinanteListItem
                {
                    Id = x.a.Id,
                    ASS_NOME = x.a.ASS_NOME,
                    ASS_EMAIL = x.a.ASS_EMAIL,
                    ASS_TELEFONE = x.a.ASS_TELEFONE,
                    ASS_CPF_CNPJ = x.a.ASS_CPF_CNPJ,
                    ASS_ATIVO = x.a.ASS_ATIVO,
                    ASS_TESTE_ATE = x.a.ASS_TESTE_ATE,
                    ASS_ORIGEM = x.a.ASS_ORIGEM,
                    ExigirTrocaSenha = x.u != null && x.u.ExigirTrocaSenha,
                    LastLogin = x.u != null ? x.u.LastLogin : null
                })
                .ToListAsync(cancellationToken);

            // Dias restantes do teste: calculado depois de ler a página, nunca no SQL
            var hoje = DateOnly.FromDateTime(DateTime.Now);
            foreach (var item in dados)
                item.TesteDiasRestantes = TesteGratis.DiasRestantes(item.ASS_TESTE_ATE, hoje);

            return Ok(new PaginatedResponse<AssinanteListItem>
            {
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                Data = dados
            });
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpGet]
    public async Task<IActionResult> Obter(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var assinante = await _repAssinante.SelectContext().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (assinante is null) return NotFound(MsgNaoEncontrado);

            var usuario = await _db.Users.AsNoTracking()
                .Where(x => x.AssinanteId == id).OrderBy(x => x.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            return Ok(ParaModel(assinante, usuario));
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    // =====================================================================================================
    // Criar / Atualizar
    // =====================================================================================================

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] AssinanteModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new AssinanteValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            var senha = SenhaTemporaria.Gerar();
            var (assinante, usuario) = await _cadastro.CriarAsync(new AssinanteCadastroDados
            {
                Nome = model.ASS_NOME,
                Email = model.ASS_EMAIL,
                Telefone = model.ASS_TELEFONE,
                CpfCnpj = model.ASS_CPF_CNPJ,
                Origem = OrigemAssinante.Admin,
                TesteAte = model.ASS_TESTE_ATE,
                EmailConfirmado = true,
                ExigirTrocaSenha = true
            }, senha, null, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            _logger.LogInformation("Assinante criado. AtorId={AtorId} AssinanteId={AssinanteId}",
                _currentUser.UserIdentity.Id, assinante.Id);

            MarcarSemCache();
            return Ok(new AssinanteSenhaTemporariaResponse
            {
                Assinante = ParaModel(assinante, usuario),
                SenhaTemporaria = senha
            });
        }
        catch (DbUpdateException ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            var duplicidade = AssinanteCadastro.EhDuplicidade(ex);
            if (!duplicidade)
                _logger.LogError(ex, "Falha ao gravar assinante. AtorId={AtorId}", _currentUser.UserIdentity.Id);
            return BadRequest(duplicidade ? MsgEmailDuplicado : MsgFalhaGravar);
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Altera nome, CPF/CNPJ, e-mail, telefone e ASS_TESTE_ATE (ignora ASS_ATIVO e ASS_ORIGEM). E-mail e nome acompanham o usuário de login.</summary>
    [HttpPut]
    public async Task<IActionResult> Atualizar([FromBody] AssinanteModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new AssinanteValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            if (model.Id is null || model.Id == Guid.Empty)
                throw new Exception(MsgIdObrigatorio);

            // Entidades rastreadas: só as colunas alteradas vão no UPDATE (sem Update*)
            var assinante = await _repAssinante.SelectContext().FirstOrDefaultAsync(x => x.Id == model.Id, cancellationToken);
            if (assinante is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            var usuario = await _db.Users.Where(x => x.AssinanteId == assinante.Id).OrderBy(x => x.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            // Só diferença de caixa não conta como mudança
            var emailMudou = !string.Equals(assinante.ASS_EMAIL, model.ASS_EMAIL, StringComparison.OrdinalIgnoreCase)
                || (usuario is not null && !string.Equals(usuario.Email, model.ASS_EMAIL, StringComparison.OrdinalIgnoreCase));
            if (emailMudou && await _cadastro.EmailEmUsoAsync(model.ASS_EMAIL, usuario?.Id, cancellationToken))
                throw new Exception(MsgEmailDuplicado);
            if (emailMudou && usuario is not null)
                await _cadastro.ValidarLoginIdentityAsync(usuario.Id, model.ASS_EMAIL);
            await _cadastro.GarantirCpfCnpjUnicoAsync(model.ASS_CPF_CNPJ, assinante.Id, cancellationToken);

            Aplicar(assinante, model);

            var usuarioMudou = false;
            if (usuario is not null)
            {
                if (usuario.FullName != model.ASS_NOME) { usuario.FullName = model.ASS_NOME; usuarioMudou = true; }
                if (emailMudou)
                {
                    // Troca o login junto, sem SetEmailAsync (ele zeraria EmailConfirmed e renovaria o SecurityStamp)
                    usuario.Email = model.ASS_EMAIL;
                    usuario.UserName = model.ASS_EMAIL;
                    usuario.NormalizedEmail = _userManager.NormalizeEmail(model.ASS_EMAIL);
                    usuario.NormalizedUserName = _userManager.NormalizeName(model.ASS_EMAIL);
                    usuarioMudou = true;
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);
            if (usuario is not null && usuarioMudou) _sessaoCache.Invalidar(usuario.Id);

            _logger.LogInformation("Assinante atualizado. AtorId={AtorId} AssinanteId={AssinanteId}",
                _currentUser.UserIdentity.Id, assinante.Id);

            return Ok(ParaModel(assinante, usuario));
        }
        catch (DbUpdateException ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            var duplicidade = AssinanteCadastro.EhDuplicidade(ex);
            if (!duplicidade)
                _logger.LogError(ex, "Falha ao gravar assinante. AtorId={AtorId}", _currentUser.UserIdentity.Id);
            return BadRequest(duplicidade ? MsgEmailDuplicado : MsgFalhaGravar);
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    // =====================================================================================================
    // Bloquear / reativar / redefinir acesso
    // =====================================================================================================

    /// <summary>Bloqueia o assinante (ASS_ATIVO = false). Idempotente. A sessão dos usuários dele cai na hora.</summary>
    [HttpPost]
    public Task<IActionResult> Inativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, false, "Assinante bloqueado", cancellationToken);

    /// <summary>Reativa o assinante (ASS_ATIVO = true). Idempotente.</summary>
    [HttpPost]
    public Task<IActionResult> Ativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, true, "Assinante reativado", cancellationToken);

    /// <summary>
    /// Gera nova senha temporária para o usuário do assinante, exige a troca no próximo acesso e zera o bloqueio por tentativas.
    /// Funciona mesmo com o assinante bloqueado. Não derruba a sessão já aberta (o JWT não confere o SecurityStamp).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> RedefinirAcesso(Guid id, CancellationToken cancellationToken)
    {
        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinante = await _repAssinante.SelectContext().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (assinante is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            var usuario = await _db.Users.Where(x => x.AssinanteId == id).OrderBy(x => x.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new Exception(MsgSemUsuario);
            if (!await _userManager.IsInRoleAsync(usuario, RoleNames.Assinante))
                throw new Exception(MsgSemUsuario);

            var senha = SenhaTemporaria.Gerar();
            usuario.ExigirTrocaSenha = true;

            // ResetPasswordAsync grava a nova senha e o ExigirTrocaSenha (mesma entidade rastreada)
            var token = await _userManager.GeneratePasswordResetTokenAsync(usuario);
            var redefiniu = await _userManager.ResetPasswordAsync(usuario, token, senha);
            if (!redefiniu.Succeeded) throw new Exception("Não foi possível redefinir o acesso. Tente novamente.");

            // Zera o bloqueio por tentativas (SetLockoutEndDateAsync exige o lockout habilitado)
            if (!usuario.LockoutEnabled)
            {
                var habilitou = await _userManager.SetLockoutEnabledAsync(usuario, true);
                if (!habilitou.Succeeded) throw new Exception("Não foi possível redefinir o acesso. Tente novamente.");
            }
            var zerou = await _userManager.ResetAccessFailedCountAsync(usuario);
            if (!zerou.Succeeded) throw new Exception("Não foi possível redefinir o acesso. Tente novamente.");
            var liberou = await _userManager.SetLockoutEndDateAsync(usuario, null);
            if (!liberou.Succeeded) throw new Exception("Não foi possível redefinir o acesso. Tente novamente.");

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);
            _sessaoCache.Invalidar(usuario.Id);

            // Nunca registra a senha
            _logger.LogInformation("Acesso do assinante redefinido. AtorId={AtorId} AssinanteId={AssinanteId} AlvoId={AlvoId}",
                _currentUser.UserIdentity.Id, id, usuario.Id);

            MarcarSemCache();
            return Ok(new AssinanteSenhaTemporariaResponse
            {
                Assinante = ParaModel(assinante, usuario),
                SenhaTemporaria = senha
            });
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    // =====================================================================================================
    // Auxiliares
    // =====================================================================================================

    private async Task<IActionResult> AlterarSituacaoAsync(Guid id, bool ativo, string logMensagem, CancellationToken cancellationToken)
    {
        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinante = await _repAssinante.SelectContext().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (assinante is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            // Lê os usuários ANTES do commit: se a leitura falhar, nada é gravado e nenhuma sessão fica viva com estado trocado
            var usuarios = await _db.Users.AsNoTracking().Where(u => u.AssinanteId == id)
                .OrderBy(u => u.CreatedAt).ToListAsync(cancellationToken);

            if (assinante.ASS_ATIVO != ativo) // idempotente
            {
                assinante.ASS_ATIVO = ativo;
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            await _unitOfWork.CommitAsync(cancellationToken);

            // Só depois do commit: a revalidação seguinte já enxerga o novo estado
            foreach (var usuario in usuarios)
                _sessaoCache.Invalidar(usuario.Id);

            _logger.LogInformation("{Mensagem}. AtorId={AtorId} AssinanteId={AssinanteId}",
                logMensagem, _currentUser.UserIdentity.Id, id);

            return Ok(ParaModel(assinante, usuarios.FirstOrDefault()));
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Respostas com senha nunca podem ser guardadas em cache.</summary>
    private void MarcarSemCache()
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers.Pragma = "no-cache";
    }

    /// <summary>Trim em tudo; e-mail em minúsculas; CPF/CNPJ e telefone só com dígitos; vazio vira nulo. Campos somente de saída não são lidos.</summary>
    private static void Normalizar(AssinanteModel m)
    {
        m.ASS_NOME = (m.ASS_NOME ?? string.Empty).Trim();
        m.ASS_EMAIL = AssinanteCadastro.NormalizarEmail(m.ASS_EMAIL);
        m.ASS_CPF_CNPJ = AssinanteCadastro.SomenteDigitosOuNulo(m.ASS_CPF_CNPJ);
        m.ASS_TELEFONE = AssinanteCadastro.SomenteDigitosOuNulo(m.ASS_TELEFONE);
    }

    /// <summary>Aplica só os campos editáveis (nunca ASS_ATIVO nem ASS_ORIGEM).</summary>
    private static void Aplicar(Assinante a, AssinanteModel m)
    {
        a.ASS_NOME = m.ASS_NOME;
        a.ASS_CPF_CNPJ = m.ASS_CPF_CNPJ;
        a.ASS_EMAIL = m.ASS_EMAIL;
        a.ASS_TELEFONE = m.ASS_TELEFONE;
        a.ASS_TESTE_ATE = m.ASS_TESTE_ATE; // data passada é permitida (encerra o teste); ASS_ORIGEM do body é sempre ignorado
    }

    private static AssinanteModel ParaModel(Assinante a, Usuario? u) => new()
    {
        Id = a.Id,
        ASS_NOME = a.ASS_NOME,
        ASS_CPF_CNPJ = a.ASS_CPF_CNPJ,
        ASS_EMAIL = a.ASS_EMAIL,
        ASS_TELEFONE = a.ASS_TELEFONE,
        ASS_ATIVO = a.ASS_ATIVO,
        ASS_TESTE_ATE = a.ASS_TESTE_ATE,
        ASS_ORIGEM = a.ASS_ORIGEM,
        TesteDiasRestantes = TesteGratis.DiasRestantes(a.ASS_TESTE_ATE, DateOnly.FromDateTime(DateTime.Now)),
        ExigirTrocaSenha = u?.ExigirTrocaSenha ?? false,
        LastLogin = u?.LastLogin,
        CreatedAt = a.CreatedAt
    };
}
