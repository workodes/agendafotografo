using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Infra.Data.Context;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Validators.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AgendaFotografo.WebApi.Controllers;

public class AuthController(UserManager<Usuario> userManager, IConfiguration configuration, ICurrentUser currentUser, EfDbContext db,
    ILogger<AuthController> logger) : AgendaFotografoController
{
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

            if (!usuario.Ativo)
                throw new Exception("Usuário inativo. Procure o administrador do sistema");

            var roles = await _userManager.GetRolesAsync(usuario);
            var role = roles.FirstOrDefault() ?? string.Empty;

            // Assinante só entra com vínculo a um assinante ATIVO; checado antes de emitir o token
            string? assinanteNome = null;
            if (role == RoleNames.Assinante)
            {
                var vinculo = usuario.AssinanteId is null ? null
                    : await _db.Assinantes.AsNoTracking().Where(a => a.Id == usuario.AssinanteId && a.ASS_ATIVO)
                        .Select(a => new { a.ASS_NOME }).FirstOrDefaultAsync(cancellationToken);
                if (vinculo is null)
                    throw new Exception("Acesso indisponível. Procure o administrador do sistema.");
                assinanteNome = vinculo.ASS_NOME;
            }

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

            return Ok(new LoginResponse
            {
                Token = new JwtSecurityTokenHandler().WriteToken(token),
                ExpiraEm = expiraEm,
                Id = usuario.Id,
                FullName = usuario.FullName,
                Email = usuario.Email ?? string.Empty,
                Role = role,
                ExigirTrocaSenha = usuario.ExigirTrocaSenha,
                AssinanteNome = assinanteNome
            });
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
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
}
