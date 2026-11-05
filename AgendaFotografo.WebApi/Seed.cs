using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Infra.Data.Context;
using AgendaFotografo.WebApi.Services.TiposEvento;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi;

public class Seed(RoleManager<IdentityRole> roleManager, UserManager<Usuario> userManager, EfDbContext db,
    TipoEventoPadrao tipoEventoPadrao, IConfiguration configuration, IHostEnvironment environment, ILogger<Seed> logger)
{
    public const string AdminEmail = "admin@agendafotografo.com.br";
    public const string AdminNome = "Administrador";

    // Senha padrão do admin inicial (decisão do colaborador: fica no código e vai para o git).
    // Seed:AdminPassword, se preenchido, tem prioridade. Só vale na criação: admin existente não é alterado.
    public const string SenhaPadraoAdmin = "Af94d18aa6170fd9a58f617";

    public async Task ExecuteAsync()
    {
        foreach (var role in RoleNames.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        await GarantirAdminAsync();

        // Roda sempre, depois do admin
        await GarantirTiposEventoPadraoAsync();
    }

    private async Task GarantirAdminAsync()
    {
        var email = AdminEmail;
        var admin = await userManager.FindByEmailAsync(email);
        if (admin is null)
        {
            var emDesenvolvimento = environment.IsDevelopment();
            var senha = configuration["Seed:AdminPassword"];
            if (string.IsNullOrEmpty(senha))
                senha = SenhaPadraoAdmin;

            admin = new Usuario
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                LockoutEnabled = true,
                FullName = AdminNome,
                CreatedAt = DateTime.Now,
                Ativo = true,
                // Admin criado fora do Development nasce com troca de senha obrigatória.
                ExigirTrocaSenha = !emDesenvolvimento
            };

            var result = await userManager.CreateAsync(admin, senha);
            if (!result.Succeeded)
                throw new Exception("Falha ao criar o usuário admin inicial: " + string.Join("; ", result.Errors.Select(e => e.Description)));

            logger.LogInformation("Usuário admin inicial criado (ambiente {Ambiente}).", environment.EnvironmentName);
        }

        // O bloqueio por tentativas só vale com o lockout habilitado (admin criado antes dessa regra pode estar sem)
        if (!admin.LockoutEnabled)
            await userManager.SetLockoutEnabledAsync(admin, true);

        if (!await userManager.IsInRoleAsync(admin, RoleNames.Admin))
            await userManager.AddToRoleAsync(admin, RoleNames.Admin);
    }

    /// <summary>
    /// Idempotente: cada assinante SEM nenhum tipo de evento (ativo ou não) recebe os tipos padrão. Quem já tem algum não é tocado.
    /// </summary>
    private async Task GarantirTiposEventoPadraoAsync()
    {
        var assinantesSemTipos = await db.Assinantes.AsNoTracking()
            .Where(a => !db.TiposEvento.Any(t => t.TPE_ASSINANTE_ID == a.Id))
            .Select(a => a.Id)
            .ToListAsync();

        foreach (var assinanteId in assinantesSemTipos)
            await tipoEventoPadrao.CriarPadroesAsync(assinanteId, CancellationToken.None);

        // Um único SaveChanges: grava todos os assinantes ou nenhum
        if (assinantesSemTipos.Count > 0)
            await db.SaveChangesAsync();

        logger.LogInformation("Tipos de evento padrão criados para {Quantidade} assinante(s).", assinantesSemTipos.Count);
    }
}
