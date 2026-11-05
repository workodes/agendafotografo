namespace AgendaFotografo.WebApi.Services.Assinantes;

/// <summary>
/// Prepara os dados iniciais de um assinante recém-criado (ex.: tipos de evento padrão).
/// Contrato: roda DENTRO da transação do <c>AssinanteController.Criar</c>; só grava com os métodos <c>*TransactionAsync</c>
/// dos repositórios e NUNCA chama <c>SaveChanges</c> nem <c>Commit</c> (quem fecha a transação é o controller).
/// </summary>
public interface IAssinanteInicializacao
{
    Task PrepararNovoAssinanteAsync(Guid assinanteId, CancellationToken cancellationToken);
}
