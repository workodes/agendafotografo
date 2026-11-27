using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Models.Fotografo;
using AgendaFotografo.WebApi.Services.CurrentUser;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Escalas;

/// <summary>
/// ÚNICO lugar da regra do vínculo por documento de fotógrafo ou coordenador (plano 23) com os eventos de outros coordenadores. O vínculo é vivo
/// (calculado a cada leitura, nada é copiado): parte do documento da conta (CPF de 11 ou CNPJ de 14 dígitos, lido do banco pelo
/// <see cref="FotografoEscopo"/>; nulo ou de outro tamanho = nenhum evento) e só vale para membros com o MESMO <c>MEM_CPF</c> (CPF com CPF,
/// CNPJ com CNPJ) de OUTRO assinante, do tipo Coordenador e ativo, com membro, escala e evento do MESMO assinante.
/// <c>MEM_ATIVO</c> não interfere. Removido da escala, evento excluído, documento trocado/apagado ou coordenador bloqueado = some.
/// Nunca loga o documento.
/// </summary>
public class EscalaFotografoConsultas(IBaseRepository<EventoMembro> repEventoMembro, FotografoEscopo fotografoEscopo)
{
    private readonly IBaseRepository<EventoMembro> _repEventoMembro = repEventoMembro;
    private readonly FotografoEscopo _fotografoEscopo = fotografoEscopo;

    /// <summary>Linhas de escala vinculadas ao fotógrafo logado; nulo quando a conta não tem documento de 11 (CPF) ou 14 (CNPJ) dígitos.</summary>
    private async Task<IQueryable<EventoMembro>?> ConsultarAsync(CancellationToken cancellationToken)
    {
        var conta = await _fotografoEscopo.ObterContaEscalaAsync(cancellationToken);
        var cpf = conta.Cpf;
        // O documento do banco já entrou validado (CPF/CNPJ); aqui só o portão de tamanho e dígitos, sem revalidar os verificadores
        if (string.IsNullOrEmpty(cpf) || cpf.Length is not (11 or 14) || !cpf.All(char.IsAsciiDigit)) return null;

        var contaId = conta.AssinanteId;
        return _repEventoMembro.SelectContext().AsNoTracking()
            .Where(x => x.Membro!.MEM_CPF == cpf
                        && x.Membro.MEM_ASSINANTE_ID != contaId
                        && x.Membro.Assinante!.ASS_TIPO == TipoAssinante.Coordenador
                        && x.Membro.Assinante.ASS_ATIVO
                        && x.EVM_ASSINANTE_ID == x.Membro.MEM_ASSINANTE_ID
                        && x.Evento!.EVE_ASSINANTE_ID == x.Membro.MEM_ASSINANTE_ID);
    }

    /// <summary>Eventos do período (inclusivo), cada um uma vez, na ordem: data, hora (nula por último), nome e Id.</summary>
    public async Task<List<EscalaItem>> ListarAsync(DateOnly de, DateOnly ate, CancellationToken cancellationToken)
    {
        var query = await ConsultarAsync(cancellationToken);
        if (query is null) return [];

        var linhas = await query
            .Where(x => x.Evento!.EVE_DATA >= de && x.Evento.EVE_DATA <= ate)
            .OrderBy(x => x.Evento!.EVE_DATA).ThenBy(x => x.Evento!.EVE_HORA == null).ThenBy(x => x.Evento!.EVE_HORA)
            .ThenBy(x => x.Evento!.EVE_NOME).ThenBy(x => x.EVM_EVENTO_ID).ThenBy(x => x.Id)
            .Select(x => new EscalaItem
            {
                EventoId = x.EVM_EVENTO_ID,
                EVE_NOME = x.Evento!.EVE_NOME,
                EVE_DATA = x.Evento.EVE_DATA,
                EVE_HORA = x.Evento.EVE_HORA,
                EVE_CIDADE = x.Evento.EVE_CIDADE,
                EVE_LOCAL = x.Evento.EVE_LOCAL,
                Cancelado = x.Evento.EVE_STATUS == StatusEvento.Cancelado,
                EVM_POSICAO = x.EVM_POSICAO,
                CoordenadorNome = x.Membro!.Assinante!.ASS_NOME
            })
            .ToListAsync(cancellationToken);

        // O mesmo documento em dois membros do mesmo coordenador não duplica o evento (a ordem acima já é estável)
        return [.. linhas.DistinctBy(x => x.EventoId)];
    }

    /// <summary>Evento vinculado (lista branca) ou nulo, sem distinguir "não existe" de "sem vínculo".</summary>
    public async Task<EscalaEventoModel?> ObterAsync(Guid eventoId, CancellationToken cancellationToken)
    {
        var query = await ConsultarAsync(cancellationToken);
        if (query is null) return null;

        var linhas = await query
            .Where(x => x.EVM_EVENTO_ID == eventoId)
            .OrderBy(x => x.Id)
            .Select(x => new EscalaEventoModel
            {
                EventoId = x.EVM_EVENTO_ID,
                EVE_NOME = x.Evento!.EVE_NOME,
                EVE_DATA = x.Evento.EVE_DATA,
                EVE_HORA = x.Evento.EVE_HORA,
                EVE_CIDADE = x.Evento.EVE_CIDADE,
                EVE_LOCAL = x.Evento.EVE_LOCAL,
                Cancelado = x.Evento.EVE_STATUS == StatusEvento.Cancelado,
                EVE_LARGADA_LOCAL = x.Evento.EVE_LARGADA_LOCAL,
                EVE_LARGADA_LINK = x.Evento.EVE_LARGADA_LINK,
                EVE_CHEGADA_LOCAL = x.Evento.EVE_CHEGADA_LOCAL,
                EVE_CHEGADA_LINK = x.Evento.EVE_CHEGADA_LINK,
                EVE_INFORMACOES = x.Evento.EVE_INFORMACOES,
                EVE_ROTA_LINK_MAPS = x.Evento.EVE_ROTA_LINK_MAPS,
                EVE_ROTA_LINK_STRAVA = x.Evento.EVE_ROTA_LINK_STRAVA,
                EVE_LINK_FOTOS = x.Evento.EVE_LINK_FOTOS,
                EVE_OBSERVACOES_EQUIPE = x.Evento.EVE_OBSERVACOES_EQUIPE,
                // Do organizador, só nome e telefone (26/11/2026), e só se for do mesmo assinante dono do evento (LEFT JOIN, sem N+1)
                OrganizadorNome = x.Evento.Organizador != null && x.Evento.Organizador.ORG_ASSINANTE_ID == x.Evento.EVE_ASSINANTE_ID
                    ? x.Evento.Organizador.ORG_NOME : null,
                OrganizadorTelefone = x.Evento.Organizador != null && x.Evento.Organizador.ORG_ASSINANTE_ID == x.Evento.EVE_ASSINANTE_ID
                    ? x.Evento.Organizador.ORG_TELEFONE : null,
                EVM_POSICAO = x.EVM_POSICAO,
                CoordenadorNome = x.Membro!.Assinante!.ASS_NOME
            })
            .Take(1)
            .ToListAsync(cancellationToken);
        return linhas.FirstOrDefault();
    }

    /// <summary>Id do coordenador (assinante dono do evento) quando a conta logada tem vínculo com o evento; senão nulo.</summary>
    public async Task<Guid?> ObterCoordenadorIdAsync(Guid eventoId, CancellationToken cancellationToken)
    {
        var query = await ConsultarAsync(cancellationToken);
        if (query is null) return null;

        var ids = await query.Where(x => x.EVM_EVENTO_ID == eventoId)
            .Select(x => x.EVM_ASSINANTE_ID).Take(1).ToListAsync(cancellationToken);
        return ids.Count == 0 ? null : ids[0];
    }
}
