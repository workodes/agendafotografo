using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Attributes;

/// <summary>
/// Marca um controller ou uma action como parte de um módulo do plano (plano 24). O <see cref="ModuloPlanoFilter"/> (global) responde 403
/// "&lt;Módulo&gt; não está disponível no seu plano." quando o usuário com role Assinante não tem o módulo. Endpoints base (Agenda, ficha,
/// cadastros, Eventos de outras equipes, Auth) não levam este atributo.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class ModuloPlanoAttribute(ModuloPlano modulo) : Attribute
{
    public ModuloPlano Modulo { get; } = modulo;
}
