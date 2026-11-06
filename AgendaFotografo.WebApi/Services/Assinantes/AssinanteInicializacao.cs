using AgendaFotografo.WebApi.Services.TiposEvento;

namespace AgendaFotografo.WebApi.Services.Assinantes;

/// <inheritdoc cref="IAssinanteInicializacao"/>
public class AssinanteInicializacao(TipoEventoPadrao tipoEventoPadrao) : IAssinanteInicializacao
{
    private readonly TipoEventoPadrao _tipoEventoPadrao = tipoEventoPadrao;

    public async Task PrepararNovoAssinanteAsync(Guid assinanteId, CancellationToken cancellationToken)
    {
        // Roda dentro da transação do AssinanteController.Criar: só inclui no contexto, quem salva e confirma é o controller
        await _tipoEventoPadrao.CriarPadroesAsync(assinanteId, cancellationToken);
    }
}
