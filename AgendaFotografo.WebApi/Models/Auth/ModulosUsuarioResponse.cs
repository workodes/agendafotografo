using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>Resposta do <c>GET Auth/Modulos</c> (plano 24): plano e módulos liberados do usuário logado (números do enum <see cref="ModuloPlano"/>).</summary>
public class ModulosUsuarioResponse
{
    /// <summary>Nome do plano; nulo = conta sem plano (só a base).</summary>
    public string? PlanoNome { get; set; }
    public ModuloPlano[] Modulos { get; set; } = [];
}
