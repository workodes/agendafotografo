using System.Globalization;
using System.Text.Json.Serialization;
using AgendaFotografo.WebApi;
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

var app = builder.Build();

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
app.UseHttpsRedirection();
// SPA Angular publicada em wwwroot (mesma origem da API); rotas desconhecidas fora de /api caem no index.html.
// Os arquivos estáticos vêm ANTES do UseRouting explícito: o roteamento implícito do WebApplication escolheria
// o fallback primeiro e o UseStaticFiles ignoraria a requisição.
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("{*path:regex(^(?!api/).*$)}", "index.html");

await app.MigrateDatabaseAsync();
await Setup.RegisterCustomSeedAsync(app);

app.Run();
return 0;
