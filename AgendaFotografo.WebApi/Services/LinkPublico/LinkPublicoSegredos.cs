using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace AgendaFotografo.WebApi.Services.LinkPublico;

/// <summary>
/// Segredos do link público: token da URL, código de 4 dígitos, carimbo e o JWT de acesso de 7 dias. A chave do JWT de acesso é
/// derivada (HKDF) do <c>Jwt:Key</c> com um contexto próprio, portanto é diferente da chave do login. Nada daqui vai para o log.
/// </summary>
public class LinkPublicoSegredos
{
    public const string Emissor = "AgendaFotografo.LinkPublico";
    public const string Audiencia = "AgendaFotografo.LinkPublico";
    public static readonly TimeSpan ValidadeAcesso = TimeSpan.FromDays(7);

    private const string ClaimLink = "lid";
    private const string ClaimCarimbo = "car";

    private readonly SymmetricSecurityKey _chave;

    public LinkPublicoSegredos(IConfiguration configuration)
    {
        var jwtKey = Encoding.UTF8.GetBytes(Setup.ObterJwtKey(configuration));
        var derivada = HKDF.DeriveKey(HashAlgorithmName.SHA256, jwtKey, 32, salt: null,
            info: Encoding.UTF8.GetBytes("AgendaFotografo/LinkPublico/Acesso/v1"));
        _chave = new SymmetricSecurityKey(derivada);
    }

    /// <summary>16 bytes aleatórios em 32 hexadecimais minúsculos.</summary>
    public static string GerarToken() => Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(16));

    /// <summary>Carimbo: muda a cada novo código ou link e invalida os acessos já liberados.</summary>
    public static string GerarCarimbo() => Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(16));

    /// <summary>4 dígitos sorteados, sem 4 iguais, sem sequência simples (crescente ou decrescente) e diferente do anterior.</summary>
    public static string GerarCodigo(string? anterior = null)
    {
        while (true)
        {
            var codigo = RandomNumberGenerator.GetInt32(0, 10000).ToString("D4");
            if (codigo == anterior) continue;
            if (codigo.Distinct().Count() == 1) continue;
            if (Sequencial(codigo)) continue;
            return codigo;
        }
    }

    private static bool Sequencial(string codigo)
    {
        var crescente = true;
        var decrescente = true;
        for (var i = 1; i < codigo.Length; i++)
        {
            if (codigo[i] != codigo[i - 1] + 1) crescente = false;
            if (codigo[i] != codigo[i - 1] - 1) decrescente = false;
        }
        return crescente || decrescente;
    }

    /// <summary>Só aceita exatamente 4 dígitos ASCII.</summary>
    public static bool CodigoValido(string? codigo) =>
        codigo is { Length: 4 } && codigo.All(c => c is >= '0' and <= '9');

    /// <summary>Compara em tempo constante.</summary>
    public static bool CodigoConfere(string esperado, string? informado)
    {
        if (!CodigoValido(informado) || !CodigoValido(esperado)) return false;
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(esperado), Encoding.ASCII.GetBytes(informado!));
    }

    /// <summary>Emite o acesso de 7 dias para o link (Id e carimbo vão nas claims). Devolve o JWT e o vencimento em UTC.</summary>
    public (string Acesso, DateTime ExpiraEmUtc) EmitirAcesso(Guid linkId, string carimbo)
    {
        var agora = DateTime.UtcNow;
        var expira = agora.Add(ValidadeAcesso);
        var jwt = new JwtSecurityToken(
            issuer: Emissor,
            audience: Audiencia,
            claims: [new Claim(ClaimLink, linkId.ToString("N")), new Claim(ClaimCarimbo, carimbo)],
            notBefore: agora,
            expires: expira,
            signingCredentials: new SigningCredentials(_chave, SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expira);
    }

    /// <summary>Confere assinatura, emissor, audiência, validade (sem tolerância), Id do link e carimbo. Qualquer falha = falso.</summary>
    public bool AcessoValido(string? acesso, Guid linkId, string carimbo)
    {
        if (string.IsNullOrWhiteSpace(acesso) || acesso.Length > 2000) return false;
        try
        {
            var parametros = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = Emissor,
                ValidateAudience = true,
                ValidAudience = Audiencia,
                ValidateLifetime = true,
                RequireExpirationTime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = _chave,
                ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                ClockSkew = TimeSpan.Zero
            };
            var principal = new JwtSecurityTokenHandler { MapInboundClaims = false }.ValidateToken(acesso, parametros, out _);
            var idToken = principal.FindFirst(ClaimLink)?.Value;
            var carimboToken = principal.FindFirst(ClaimCarimbo)?.Value;
            if (idToken is null || carimboToken is null) return false;
            return string.Equals(idToken, linkId.ToString("N"), StringComparison.Ordinal)
                && CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(carimboToken), Encoding.ASCII.GetBytes(carimbo));
        }
        catch (Exception)
        {
            return false;
        }
    }
}
