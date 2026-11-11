using System.Security.Claims;
using System.Text;
using AgendaFotografo.CrossCutting.Services.Arquivos;
using AgendaFotografo.CrossCutting.Services.IA;
using AgendaFotografo.CrossCutting.Services.Mail;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.Infra.Data.Context;
using AgendaFotografo.Infra.Data.Interceptors;
using AgendaFotografo.Infra.Data.Repository;
using AgendaFotografo.WebApi.Services.Assinantes;
using AgendaFotografo.WebApi.Services.Avisos;
using AgendaFotografo.WebApi.Services.Chat;
using AgendaFotografo.WebApi.Services.Dashboard;
using AgendaFotografo.WebApi.Services.Eventos;
using AgendaFotografo.WebApi.Services.LinkPublico;
using AgendaFotografo.WebApi.Services.Locais;
using AgendaFotografo.WebApi.Services.Pendencias;
using AgendaFotografo.WebApi.Services.TiposEvento;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MySqlConnector;

namespace AgendaFotografo.WebApi;

public static class Setup
{
    /// <summary>
    /// Único ponto que monta a connection string: connection string do appsettings (que já traz a senha, por convenção da equipe).
    /// <c>Db:Password</c> (User Secrets ou variável <c>Db__Password</c>), se definido, sobrescreve a senha; a variável
    /// <c>ConnectionStrings__DefaultConection</c> completa também sobrescreve o appsettings (precedência padrão do .NET).
    /// </summary>
    public static MySqlConnectionStringBuilder MontarConnectionString(IConfiguration configuration)
    {
        var baseConexao = configuration.GetConnectionString("DefaultConection");
        if (string.IsNullOrWhiteSpace(baseConexao))
            throw new InvalidOperationException(
                "Connection string 'DefaultConection' não configurada. Defina ConnectionStrings:DefaultConection no appsettings.json ou na variável de ambiente ConnectionStrings__DefaultConection.");

        MySqlConnectionStringBuilder builder;
        try
        {
            builder = new MySqlConnectionStringBuilder(baseConexao);
        }
        catch (Exception)
        {
            // Não repassa a exceção original: ela poderia conter trechos da connection string.
            throw new InvalidOperationException("A connection string 'DefaultConection' está em formato inválido.");
        }

        var senha = configuration["Db:Password"];
        if (!string.IsNullOrEmpty(senha))
            builder.Password = senha;

        if (string.IsNullOrEmpty(builder.Password))
            throw new InvalidOperationException(
                "Senha do banco de dados não configurada. Informe 'Password=' na connection string 'DefaultConection' do appsettings.json " +
                "ou sobrescreva por User Secrets (Db:Password) / variável de ambiente Db__Password.");

        return builder;
    }

    /// <summary>Lê a chave do JWT e exige no mínimo 32 caracteres. Usada pela autenticação e pelo AuthController.</summary>
    public static string ObterJwtKey(IConfiguration configuration)
    {
        var key = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
            throw new InvalidOperationException(
                "Jwt:Key não configurada ou com menos de 32 caracteres. Defina Jwt:Key no appsettings.json ou sobrescreva por User Secrets / " +
                "variável de ambiente Jwt__Key (gere uma com: openssl rand -hex 32).");
        return key;
    }

    public static IServiceCollection AddCustomDbContext(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = MontarConnectionString(configuration).ConnectionString;

        services.AddDbContext<EfDbContext>((sp, options) =>
        {
            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString),
                    b => b.MigrationsAssembly(typeof(EfDbContext).Assembly.FullName))
                .AddInterceptors(sp.GetRequiredService<AuditableEntitiesInterceptor>());
        });

        return services;
    }

    public static IServiceCollection AddCustomIdentity(this IServiceCollection services)
    {
        services.AddIdentity<Usuario, IdentityRole>(options =>
        {
            options.Password.RequiredLength = 8;
            options.Password.RequireDigit = false;
            options.Password.RequireLowercase = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequiredUniqueChars = 1;
            options.User.RequireUniqueEmail = true;

            // 5 senhas erradas bloqueiam o login por 15 minutos (usuários novos já nascem com lockout habilitado)
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.AllowedForNewUsers = true;
        })
        .AddEntityFrameworkStores<EfDbContext>()
        .AddDefaultTokenProviders();

        return services;
    }

    public static IServiceCollection AddCustomAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var key = ObterJwtKey(configuration);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                ClockSkew = TimeSpan.Zero
            };

            // Revalida Ativo e role no banco (cache de ~30 s por usuário): usuário inativado, removido ou com perfil alterado
            // perde a sessão (401) sem esperar o token expirar. Assinante sem vínculo ou com o assinante inativo também perde.
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async contexto =>
                {
                    var usuarioId = contexto.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                    var roleDoToken = contexto.Principal?.FindFirstValue(ClaimTypes.Role);
                    if (string.IsNullOrEmpty(usuarioId))
                    {
                        contexto.Fail("Sessão inválida.");
                        return;
                    }

                    var servicos = contexto.HttpContext.RequestServices;
                    var db = servicos.GetRequiredService<EfDbContext>();
                    var sessao = await servicos.GetRequiredService<SessaoUsuarioCache>().ObterAsync(usuarioId, async () =>
                    {
                        var dados = await db.Users.AsNoTracking().Where(u => u.Id == usuarioId)
                            .Select(u => new
                            {
                                u.Ativo,
                                u.AssinanteId,
                                AssinanteAtivo = u.Assinante != null && u.Assinante.ASS_ATIVO
                            })
                            .FirstOrDefaultAsync(contexto.HttpContext.RequestAborted);
                        if (dados is null) return new SessaoUsuario(false, false, []);

                        var roles = await (from ur in db.UserRoles.AsNoTracking()
                                           join r in db.Roles.AsNoTracking() on ur.RoleId equals r.Id
                                           where ur.UserId == usuarioId
                                           select r.Name!).ToListAsync(contexto.HttpContext.RequestAborted);
                        return new SessaoUsuario(true, dados.Ativo, [.. roles], dados.AssinanteId, dados.AssinanteAtivo);
                    });

                    if (!sessao.Existe || !sessao.Ativo || string.IsNullOrEmpty(roleDoToken) || !sessao.Roles.Contains(roleDoToken))
                    {
                        contexto.Fail("Sessão não é mais válida.");
                        return;
                    }

                    // Assinante sem vínculo ou com o assinante inativo perde a sessão (401)
                    if (roleDoToken == RoleNames.Assinante && (sessao.AssinanteId is null || !sessao.AssinanteAtivo))
                        contexto.Fail("Sessão não é mais válida.");
                }
            };
        });

        return services;
    }

    public static IServiceCollection RegisterCustomServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<AuditableEntitiesInterceptor>();
        services.AddMemoryCache();
        services.AddSingleton<SessaoUsuarioCache>();
        services.AddSingleton<LinkPublicoSegredos>();
        services.AddSingleton<LinkPublicoTentativas>();
        services.AddScoped(typeof(IBaseRepository<>), typeof(BaseRepository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<AssinanteEscopo>();
        services.AddScoped<IAssinanteInicializacao, AssinanteInicializacao>();
        services.AddScoped<TipoEventoPadrao>();
        services.AddScoped<EscalaConsultas>();
        services.AddScoped<PendenciaConsultas>();
        services.AddScoped<AgendaConsulta>();
        services.AddScoped<AvisoConsultas>();
        services.AddScoped<DashboardConsultas>();
        services.AddScoped<PendenciaChecklistPadrao>();

        // Assistente com IA (OpenAI ou Azure OpenAI): IA:Provedor, ApiKey, Modelo (e Endpoint no Azure); configuração incompleta desliga o chat (sem quebrar a subida)
        services.AddIAChat(configuration);
        services.AddSingleton<ChatLimiteDiario>();
        services.AddScoped<ChatFerramentas>();
        services.AddHostedService<ChatAvisoInicial>();

        // Autocomplete de locais (Geoapify): chave em Geoapify:ApiKey, nunca no SPA
        services.AddHttpClient<LocalBusca>(c => c.Timeout = TimeSpan.FromSeconds(5));
        services.AddHttpClient<LinkMapsExpansor>(c => c.Timeout = TimeSpan.FromSeconds(5))
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });

        services.Configure<MailSettings>(configuration.GetSection("MailSettings"));
        services.AddSingleton<IEmailService, EmailService>();

        // Arquivos do evento: disco, fora do wwwroot (Arquivos:Pasta vazio = <ContentRoot>/App_Data/arquivos)
        services.AddSingleton(new ArquivoSettings { Pasta = configuration["Arquivos:Pasta"] ?? string.Empty });
        services.AddSingleton<IArquivoStorage>(sp => new ArquivoStorageDisco(
            sp.GetRequiredService<ArquivoSettings>(),
            sp.GetRequiredService<IHostEnvironment>().ContentRootPath));

        services.AddScoped<Seed>();
        return services;
    }

    public static async Task RegisterCustomSeedAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var seed = scope.ServiceProvider.GetRequiredService<Seed>();
        await seed.ExecuteAsync();
    }
}

public static class MigrationManager
{
    public static async Task MigrateDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        await context.Database.MigrateAsync();
    }
}
