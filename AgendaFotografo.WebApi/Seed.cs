using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
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

        // Roda sempre: planos padrão e plano dos coordenadores sem plano (plano 24)
        await GarantirPlanosPadraoAsync();

        // Roda sempre, depois do admin
        await GarantirTiposEventoPadraoAsync();

        // Roda sempre: fotógrafo não tem teste grátis (plano 21)
        await ZerarTesteDosFotografosAsync();
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
    /// Idempotente (plano 24): cria, pelo Id fixo e só se não existirem, os planos "Coordenador completo" (todos os módulos do enum:
    /// 1, 2, 4, 5, 6 e 7; o 3 é reservado) e "Fotógrafo" (só Visão da semana), com R$ 0,00, Mensal e ativos. Plano que já existe nunca é alterado (o Admin manda; módulo novo não é ligado
    /// sozinho). Depois, toda conta Coordenador (ASS_TIPO = 1) sem plano recebe o "Coordenador completo". Um único SaveChanges; o log
    /// traz só quantidades.
    /// </summary>
    private async Task GarantirPlanosPadraoAsync()
    {
        var idsPadrao = new[] { PlanosPadrao.CoordenadorCompletoId, PlanosPadrao.FotografoId };
        var existentes = await db.Planos.AsNoTracking().Where(p => idsPadrao.Contains(p.Id)).Select(p => p.Id).ToListAsync();

        var planosCriados = 0;
        if (!existentes.Contains(PlanosPadrao.CoordenadorCompletoId))
        {
            AdicionarPlano(PlanosPadrao.CoordenadorCompletoId, PlanosPadrao.CoordenadorCompletoNome, 1, Enum.GetValues<ModuloPlano>());
            planosCriados++;
        }
        if (!existentes.Contains(PlanosPadrao.FotografoId))
        {
            AdicionarPlano(PlanosPadrao.FotografoId, PlanosPadrao.FotografoNome, 2, [ModuloPlano.VisaoSemana]);
            planosCriados++;
        }

        var semPlano = await db.Assinantes
            .Where(a => a.ASS_TIPO == TipoAssinante.Coordenador && a.ASS_PLANO_ID == null)
            .ToListAsync();
        foreach (var assinante in semPlano)
            assinante.ASS_PLANO_ID = PlanosPadrao.CoordenadorCompletoId;

        // Um único SaveChanges: os planos são inseridos antes das contas que apontam para eles (o EF ordena pela FK)
        if (planosCriados > 0 || semPlano.Count > 0)
            await db.SaveChangesAsync();

        logger.LogInformation("Planos padrão criados: {Planos}. Coordenadores colocados no plano padrão: {Assinantes}.",
            planosCriados, semPlano.Count);
    }

    private void AdicionarPlano(Guid id, string nome, int ordem, IEnumerable<ModuloPlano> modulos)
    {
        db.Planos.Add(new Plano
        {
            Id = id,
            PLA_NOME = nome,
            PLA_VALOR = 0m,
            PLA_RECORRENCIA = RecorrenciaPlano.Mensal,
            PLA_ATIVO = true,
            PLA_MOSTRAR_LANDING = false,
            PLA_ORDEM = ordem,
            PLA_DESTAQUE = false
        });
        foreach (var modulo in modulos)
            db.PlanoModulos.Add(new PlanoModulo { PLM_PLANO_ID = id, PLM_MODULO = modulo });
    }

    /// <summary>
    /// Idempotente: cada assinante SEM nenhum tipo de evento (ativo ou não) recebe os tipos padrão. Quem já tem algum não é tocado.
    /// </summary>
    private async Task GarantirTiposEventoPadraoAsync()
    {
        var assinantesSemTipos = await db.Assinantes.AsNoTracking()
            .Where(a => a.ASS_TIPO == TipoAssinante.Coordenador && !db.TiposEvento.Any(t => t.TPE_ASSINANTE_ID == a.Id))
            .Select(a => a.Id)
            .ToListAsync();

        foreach (var assinanteId in assinantesSemTipos)
            await tipoEventoPadrao.CriarPadroesAsync(assinanteId, CancellationToken.None);

        // Um único SaveChanges: grava todos os assinantes ou nenhum
        if (assinantesSemTipos.Count > 0)
            await db.SaveChangesAsync();

        logger.LogInformation("Tipos de evento padrão criados para {Quantidade} assinante(s).", assinantesSemTipos.Count);
    }

    /// <summary>
    /// Idempotente (plano 21): contas Fotografo não têm teste grátis; zera ASS_TESTE_ATE das que ainda têm prazo. Um único SaveChanges.
    /// O log traz só a quantidade.
    /// </summary>
    private async Task ZerarTesteDosFotografosAsync()
    {
        var fotografos = await db.Assinantes
            .Where(a => a.ASS_TIPO == TipoAssinante.Fotografo && a.ASS_TESTE_ATE != null)
            .ToListAsync();

        foreach (var fotografo in fotografos)
            fotografo.ASS_TESTE_ATE = null;

        if (fotografos.Count > 0)
            await db.SaveChangesAsync();

        logger.LogInformation("Teste grátis zerado para {Quantidade} conta(s) de fotógrafo.", fotografos.Count);
    }
}
