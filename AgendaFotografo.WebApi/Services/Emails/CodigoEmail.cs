using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AgendaFotografo.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace AgendaFotografo.WebApi.Services.Emails;

/// <summary>Para que serve o código. Interno: fora do contrato com o SPA.</summary>
public enum FinalidadeCodigo
{
    Confirmacao,
    NovaSenha
}

/// <summary>Resultado de <see cref="CodigoEmail.ConferirAsync"/>.</summary>
public enum ResultadoCodigo
{
    Certo,
    Incorreto,
    /// <summary>Sem código, código substituído ou 5 erros (inclui o 5º erro agora).</summary>
    NaoVale,
    Venceu,
    /// <summary>Não foi possível reservar a tentativa (gravação concorrente).</summary>
    Ocupado
}

/// <summary>
/// Código de 6 números dos e-mails de conta. Fica em <c>ASPNETUSERTOKENS</c> (via UserManager), só como hash HMAC-SHA256 com chave derivada
/// (HKDF) do <c>Jwt:Key</c>; o hash cobre usuário, finalidade, e-mail e código (trocar o e-mail invalida o código). O código em texto nunca
/// é gravado. Vale 15 minutos, uso único, 5 erros invalidam, e um código novo invalida o anterior. A tentativa é reservada (gravada pelo
/// ConcurrencyStamp do Identity) ANTES de comparar; a comparação é em tempo constante. Nada daqui vai para o log.
/// </summary>
public class CodigoEmail
{
    public const string Provedor = "AgendaFotografo";
    public const int ValidadeMinutos = EmailModelos.ValidadeMinutos;
    public const int MaximoErros = 5;
    public const int SegundosEntreEnvios = 60;

    private readonly UserManager<Usuario> _userManager;
    private readonly byte[] _chave;

    public CodigoEmail(UserManager<Usuario> userManager, IConfiguration configuration)
    {
        _userManager = userManager;
        _chave = HKDF.DeriveKey(HashAlgorithmName.SHA256, Encoding.UTF8.GetBytes(Setup.ObterJwtKey(configuration)), 32, salt: null,
            info: Encoding.UTF8.GetBytes("AgendaFotografo/EmailsConta/Codigo/v1"));
    }

    private sealed class Registro
    {
        public string Hash { get; set; } = string.Empty;
        public DateTime ValidoAteUtc { get; set; }
        public DateTime EnviadoEmUtc { get; set; }
        public int Erros { get; set; }
    }

    private static string NomeToken(FinalidadeCodigo finalidade) => finalidade switch
    {
        FinalidadeCodigo.Confirmacao => "CodigoConfirmacaoEmail",
        FinalidadeCodigo.NovaSenha => "CodigoNovaSenha",
        _ => throw new InvalidOperationException("Finalidade desconhecida.")
    };

    private string CalcularHash(Usuario usuario, FinalidadeCodigo finalidade, string codigo)
    {
        var dados = Encoding.UTF8.GetBytes($"{usuario.Id}|{finalidade}|{(usuario.Email ?? string.Empty).ToLowerInvariant()}|{codigo}");
        return Convert.ToHexStringLower(HMACSHA256.HashData(_chave, dados));
    }

    /// <summary>Só aceita exatamente 6 dígitos ASCII.</summary>
    public static bool FormatoValido(string? codigo) =>
        codigo is { Length: 6 } && codigo.All(c => c is >= '0' and <= '9');

    private async Task<Registro?> LerAsync(Usuario usuario, FinalidadeCodigo finalidade)
    {
        var valor = await _userManager.GetAuthenticationTokenAsync(usuario, Provedor, NomeToken(finalidade));
        if (string.IsNullOrEmpty(valor)) return null;
        try
        {
            return JsonSerializer.Deserialize<Registro>(valor);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private async Task<bool> GravarAsync(Usuario usuario, FinalidadeCodigo finalidade, Registro registro)
    {
        var resultado = await _userManager.SetAuthenticationTokenAsync(usuario, Provedor, NomeToken(finalidade), JsonSerializer.Serialize(registro));
        return resultado.Succeeded;
    }

    /// <summary>Sorteia o código, grava o hash (invalidando o anterior da mesma finalidade) e devolve o código só em memória, para o e-mail.</summary>
    public async Task<string> GerarAsync(Usuario usuario, FinalidadeCodigo finalidade)
    {
        var codigo = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var agora = DateTime.UtcNow;
        var gravou = await GravarAsync(usuario, finalidade, new Registro
        {
            Hash = CalcularHash(usuario, finalidade, codigo),
            EnviadoEmUtc = agora,
            ValidoAteUtc = agora.AddMinutes(ValidadeMinutos),
            Erros = 0
        });
        if (!gravou) throw new Exception("Não foi possível gerar o código agora. Tente de novo.");
        return codigo;
    }

    /// <summary>Segundos que faltam para liberar outro envio (0 = liberado ou sem código).</summary>
    public async Task<int> SegundosParaReenviarAsync(Usuario usuario, FinalidadeCodigo finalidade)
    {
        var registro = await LerAsync(usuario, finalidade);
        if (registro is null) return 0;
        var passou = (DateTime.UtcNow - registro.EnviadoEmUtc).TotalSeconds;
        if (passou < 0) return SegundosEntreEnvios;
        return passou >= SegundosEntreEnvios ? 0 : (int)Math.Ceiling(SegundosEntreEnvios - passou);
    }

    /// <summary>
    /// Confere o código, na ordem: sem código, vencido, 5 ou mais erros, reserva da tentativa (pode falhar) e comparação.
    /// Código certo NÃO remove nada: quem chama remove junto da gravação do resultado.
    /// </summary>
    public async Task<ResultadoCodigo> ConferirAsync(Usuario usuario, FinalidadeCodigo finalidade, string codigo)
    {
        var registro = await LerAsync(usuario, finalidade);
        if (registro is null) return ResultadoCodigo.NaoVale;
        if (DateTime.UtcNow > registro.ValidoAteUtc) return ResultadoCodigo.Venceu;
        if (registro.Erros >= MaximoErros) return ResultadoCodigo.NaoVale;

        // Reserva: soma o erro e grava ANTES de comparar. Requisições simultâneas falham no ConcurrencyStamp em vez de ganhar palpites extras.
        var esperado = registro.Hash;
        registro.Erros++;
        if (!await GravarAsync(usuario, finalidade, registro)) return ResultadoCodigo.Ocupado;

        var informado = CalcularHash(usuario, finalidade, codigo);
        var confere = CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(esperado), Encoding.ASCII.GetBytes(informado));
        if (confere) return ResultadoCodigo.Certo;

        return registro.Erros >= MaximoErros ? ResultadoCodigo.NaoVale : ResultadoCodigo.Incorreto;
    }

    /// <summary>Remove o código de uma finalidade, ou das duas quando <paramref name="finalidade"/> é nulo.</summary>
    public async Task RemoverAsync(Usuario usuario, FinalidadeCodigo? finalidade = null)
    {
        foreach (var f in finalidade is null ? [FinalidadeCodigo.Confirmacao, FinalidadeCodigo.NovaSenha] : new[] { finalidade.Value })
            await _userManager.RemoveAuthenticationTokenAsync(usuario, Provedor, NomeToken(f));
    }
}
