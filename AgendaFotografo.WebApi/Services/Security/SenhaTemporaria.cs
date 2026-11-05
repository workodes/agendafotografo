using System.Security.Cryptography;

namespace AgendaFotografo.WebApi.Services.Security;

/// <summary>
/// Gera a senha temporária de usuário novo e de reset. 12 caracteres sorteados por <see cref="RandomNumberGenerator"/>,
/// sem caracteres ambíguos (0, O, 1, l, I). Nunca deve ir para log, exceção ou storage.
/// </summary>
public static class SenhaTemporaria
{
    public const int Tamanho = 12;
    private const string Alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    public static string Gerar()
    {
        return string.Create(Tamanho, Alfabeto, static (span, alfabeto) =>
        {
            for (var i = 0; i < span.Length; i++)
                span[i] = alfabeto[RandomNumberGenerator.GetInt32(alfabeto.Length)];
        });
    }
}
