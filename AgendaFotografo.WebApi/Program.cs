using System.Globalization;
using System.Text.Json.Serialization;
using System.Net;
using System.Threading.RateLimiting;
using AgendaFotografo.WebApi;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Localization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = null;
    o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    o.JsonSerializerOptions.AllowTrailingCommas = true;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS: Cors:Origins (lista). Sem lista: Development = qualquer origem; outros ambientes = nenhuma origem.
var origensPermitidas = (builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .Where(o => !string.IsNullOrWhiteSpace(o)).Select(o => o.Trim().TrimEnd('/')).ToArray();
var corsSemLista = origensPermitidas.Length == 0;

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
{
    if (!corsSemLista)
        p.WithOrigins(origensPermitidas).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Content-Disposition");
    else if (builder.Environment.IsDevelopment())
        p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Content-Disposition");
    // Sem lista fora do Development: nenhuma origem é liberada (a política fica vazia).
}));

builder.Services
    .RegisterCustomServices(builder.Configuration)
    .AddCustomDbContext(builder.Configuration)
    .AddCustomIdentity()
    .AddCustomAuthentication(builder.Configuration);

builder.Services.Configure<RequestLocalizationOptions>(o =>
{
    var pt = new CultureInfo("pt-BR");
    o.DefaultRequestCulture = new RequestCulture(pt);
    o.SupportedCultures = [pt];
    o.SupportedUICultures = [pt];
});

// IP real atrás do proxy (Nginx/Traefik): só aceita X-Forwarded-* de quem está em KnownProxies/KnownIPNetworks (nunca limpamos as listas
// para "confiar em todos"; os padrões de loopback continuam). Um salto só (ForwardLimit = 1): o Nginx entrega o IP real.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.ForwardLimit = 1;

    foreach (var proxy in LerListaConfig(builder.Configuration, "ForwardedHeaders:KnownProxies"))
    {
        if (!IPAddress.TryParse(proxy, out var ip))
            throw new InvalidOperationException($"ForwardedHeaders:KnownProxies com valor inválido: '{proxy}'. Informe um endereço IP (ex.: 172.18.0.2).");
        o.KnownProxies.Add(ip);
    }

    foreach (var rede in LerListaConfig(builder.Configuration, "ForwardedHeaders:KnownIPNetworks"))
    {
        if (!System.Net.IPNetwork.TryParse(rede, out var faixa))
            throw new InvalidOperationException($"ForwardedHeaders:KnownIPNetworks com valor inválido: '{rede}'. Informe uma faixa CIDR (ex.: 172.18.0.0/16).");
        o.KnownIPNetworks.Add(faixa);
    }
});

// Rate limit geral do link público: 60 requisições por minuto por IP (janela fixa). As tentativas de código têm limite próprio.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.OnRejected = async (contexto, ct) =>
    {
        contexto.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        contexto.HttpContext.Response.Headers.CacheControl = "no-store";
        contexto.HttpContext.Response.Headers["X-Robots-Tag"] = "noindex";
        contexto.HttpContext.Response.ContentType = "text/plain; charset=utf-8";
        await contexto.HttpContext.Response.WriteAsync("Muitas requisições. Aguarde um minuto e tente de novo.", ct);
    };
    o.AddPolicy("LinkPublico", contexto => RateLimitPartition.GetFixedWindowLimiter(
        contexto.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));
});

var app = builder.Build();

// Primeiro middleware: o resto da pipeline (rate limit, logs) já enxerga o IP real
app.UseForwardedHeaders();

var conexao = Setup.MontarConnectionString(builder.Configuration);
app.Logger.LogInformation("Banco de dados: servidor {Servidor}, banco {Banco}, ambiente {Ambiente}",
    conexao.Server, conexao.Database, app.Environment.EnvironmentName);

if (corsSemLista && !app.Environment.IsDevelopment())
    app.Logger.LogWarning("Cors:Origins não configurado: nenhuma origem externa será aceita no ambiente {Ambiente}. Defina Cors__Origins__0 (e seguintes) com a URL do SPA.", app.Environment.EnvironmentName);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRequestLocalization();
// Em Development o SPA local chama http://localhost:5289; redirecionar para https quebraria o preflight do CORS
// (o navegador não segue redirecionamento no OPTIONS) quando a API sobe com as duas URLs do launchSettings.
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
// SPA Angular publicada em wwwroot (mesma origem da API); rotas desconhecidas fora de /api caem no index.html.
// Os arquivos estáticos vêm ANTES do UseRouting explícito: o roteamento implícito do WebApplication escolheria
// o fallback primeiro e o UseStaticFiles ignoraria a requisição.
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("{*path:regex(^(?!api/).*$)}", "index.html");

await app.MigrateDatabaseAsync();
await Setup.RegisterCustomSeedAsync(app);

app.Run();
return 0;

// Lê uma lista de configuração (appsettings ou variáveis ForwardedHeaders__KnownProxies__0...), ignorando itens vazios.
static string[] LerListaConfig(IConfiguration configuration, string secao) =>
    (configuration.GetSection(secao).Get<string[]>() ?? [])
    .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToArray();
