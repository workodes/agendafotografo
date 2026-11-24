using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.Infra.Data.Context;
using AgendaFotografo.WebApi.Services.Assinantes;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Financeiro;

/// <summary>
/// Geração dos lançamentos dos gastos fixos (plano 22), "preguiçosa" (ao abrir o Financeiro) e idempotente. Para cada gasto fixo
/// ATIVO do assinante cria uma Despesa por mês, do mês seguinte a <c>GAF_GERADO_ATE</c> (ou do mês atual, se nulo) até o mês atual,
/// e grava <c>GAF_GERADO_ATE</c> = mês atual, tudo numa transação com um só <c>SaveChanges</c>. O índice único
/// <c>(LAN_GASTO_FIXO_ID, LAN_REFERENCIA)</c> barra a geração duplicada numa corrida: o conflito é tratado como "já gerado".
/// Excluir um lançamento gerado não o recria (o marcador está no gasto fixo). Nunca loga título, valor nem observações.
/// </summary>
public class GastoFixoGeracao(
    IBaseRepository<GastoFixo> repGastoFixo,
    IBaseRepository<Lancamento> repLancamento,
    IUnitOfWork unitOfWork,
    EfDbContext db,
    ILogger<GastoFixoGeracao> logger)
{
    private readonly IBaseRepository<GastoFixo> _repGastoFixo = repGastoFixo;
    private readonly IBaseRepository<Lancamento> _repLancamento = repLancamento;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly EfDbContext _db = db;
    private readonly ILogger<GastoFixoGeracao> _logger = logger;

    /// <summary>Gera o que falta até o mês de <paramref name="hoje"/> e devolve a quantidade de lançamentos criados.</summary>
    public async Task<int> GerarAsync(Guid assinanteId, DateOnly hoje, CancellationToken cancellationToken)
    {
        var mesAtual = PrimeiroDiaDoMes(hoje);

        var fixos = await _repGastoFixo.SelectContext()
            .Where(x => x.GAF_ASSINANTE_ID == assinanteId && x.GAF_ATIVO)
            .ToListAsync(cancellationToken);

        var novos = new List<Lancamento>();
        foreach (var gasto in fixos)
        {
            var proximo = gasto.GAF_GERADO_ATE is null ? mesAtual : PrimeiroDiaDoMes(gasto.GAF_GERADO_ATE.Value).AddMonths(1);
            if (proximo > mesAtual) continue; // já gerado até o mês atual (ou além)

            for (var mes = proximo; mes <= mesAtual; mes = mes.AddMonths(1))
            {
                novos.Add(new Lancamento
                {
                    LAN_ASSINANTE_ID = assinanteId,
                    LAN_TIPO = TipoLancamento.Despesa,
                    LAN_TITULO = gasto.GAF_TITULO,
                    LAN_VALOR = gasto.GAF_VALOR,
                    LAN_DATA = DataDoMes(mes, gasto.GAF_DIA),
                    LAN_CATEGORIA = gasto.GAF_CATEGORIA,
                    LAN_GASTO_FIXO_ID = gasto.Id,
                    LAN_REFERENCIA = mes
                });
            }
            gasto.GAF_GERADO_ATE = mesAtual;
        }

        // Nada a gerar: não abre transação
        if (novos.Count == 0) return 0;

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            await _repLancamento.InsertRangeTransactionAsync(novos, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            _logger.LogInformation("Gastos fixos: {Quantidade} lançamento(s) gerado(s) para o assinante {AssinanteId}.", novos.Count, assinanteId);
            return novos.Count;
        }
        catch (DbUpdateException ex) when (AssinanteCadastro.EhDuplicidade(ex))
        {
            // Outra requisição gerou os mesmos meses primeiro: já está gerado
            await _unitOfWork.RollbackAsync(cancellationToken);
            _db.ChangeTracker.Clear();
            _logger.LogInformation("Gastos fixos: geração já feita por outra requisição para o assinante {AssinanteId}.", assinanteId);
            return 0;
        }
        catch
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }
    }

    /// <summary>
    /// Regra de retomada (<c>Ativar</c>): para não gerar retroativo dos meses da pausa, <c>GAF_GERADO_ATE</c> sobe para o mês anterior
    /// ao atual se estiver mais antigo (o mês atual é gerado). Nulo continua nulo (começa no mês atual).
    /// </summary>
    public static void AplicarRetomada(GastoFixo gasto, DateOnly hoje)
    {
        if (gasto.GAF_GERADO_ATE is null) return;
        var mesAnterior = PrimeiroDiaDoMes(hoje).AddMonths(-1);
        if (PrimeiroDiaDoMes(gasto.GAF_GERADO_ATE.Value) < mesAnterior) gasto.GAF_GERADO_ATE = mesAnterior;
    }

    public static DateOnly PrimeiroDiaDoMes(DateOnly data) => new(data.Year, data.Month, 1);

    /// <summary>Dia configurado dentro do mês; dia 29 a 31 em mês mais curto vira o último dia do mês.</summary>
    public static DateOnly DataDoMes(DateOnly primeiroDia, int dia)
        => new(primeiroDia.Year, primeiroDia.Month, Math.Min(Math.Max(dia, 1), DateTime.DaysInMonth(primeiroDia.Year, primeiroDia.Month)));
}
