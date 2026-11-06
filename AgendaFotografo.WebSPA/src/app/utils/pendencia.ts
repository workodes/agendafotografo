import { StatusPendencia } from 'app/models/enums/StatusPendencia';
import { formatarData, formatarDiaMes, parseDataIso } from './data-evento';

/** Prazo da pendência: "dd/MM" (com o ano se não for o atual); sem prazo devolve o texto informado. */
export function formatarPrazo(prazo: string | null | undefined, vazio: string = 'Sem prazo'): string {
    const d = parseDataIso(prazo);
    if (!d) {
        return vazio;
    }
    return d.getFullYear() === new Date().getFullYear() ? formatarDiaMes(prazo) : formatarData(prazo);
}

// ---- Prazo relativo dos modelos do checklist padrão (PEM_DIAS_ANTES) ----
// Positivo = dias antes do evento, negativo = depois, null = sem prazo (a API aceita de -90 a 365).

export type TipoPrazoModelo = 'sem' | 'antes' | 'depois';

export const DIAS_PRAZO_MIN = 0;
export const DIAS_PRAZO_MAX_ANTES = 365;
export const DIAS_PRAZO_MAX_DEPOIS = 90;

/** Texto do prazo do modelo: "14 dias antes", "1 dia depois", "No dia do evento" ou "Sem prazo". */
export function textoPrazoModelo(diasAntes: number | null | undefined): string {
    if (diasAntes == null) {
        return 'Sem prazo';
    }
    if (diasAntes === 0) {
        return 'No dia do evento';
    }
    const n = Math.abs(diasAntes);
    return `${n} ${n === 1 ? 'dia' : 'dias'} ${diasAntes > 0 ? 'antes' : 'depois'}`;
}

/** Valor da API (PEM_DIAS_ANTES) para os dois controles da ficha (tipo do prazo e número de dias). */
export function prazoParaControles(diasAntes: number | null | undefined): { tipo: TipoPrazoModelo; dias: number | null } {
    if (diasAntes == null) {
        return { tipo: 'sem', dias: null };
    }
    return diasAntes >= 0 ? { tipo: 'antes', dias: diasAntes } : { tipo: 'depois', dias: Math.abs(diasAntes) };
}

/** Os dois controles da ficha para o valor da API: antes = positivo, depois = negativo, sem prazo = null. */
export function controlesParaPrazo(tipo: TipoPrazoModelo, dias: number | null | undefined): number | null {
    if (tipo === 'sem' || dias == null) {
        return null;
    }
    return tipo === 'antes' ? dias : -dias;
}

// ---- Filtros rápidos da tela Pendências (painel lateral) ----
// Mapeamento da UI para os parâmetros da API (sem regra de negócio): cada filtro rápido é um par status + prazo.

export type ChaveFiltroRapido = 'abertas' | 'vencidas' | 'vencendo' | 'concluidas' | 'ignoradas';

export interface FiltroRapido {
    chave: ChaveFiltroRapido;
    rotulo: string;
    icone: string;
    status: string;
    prazo: string;
    // Propriedade de PendenciasContagem com o número do filtro.
    campo: 'Abertas' | 'Vencidas' | 'Vencendo' | 'Concluidas' | 'Ignoradas';
}

export const FILTROS_RAPIDOS: FiltroRapido[] = [
    { chave: 'abertas', rotulo: 'Abertas', icone: 'heroicons_outline:inbox', status: 'abertas', prazo: 'todos', campo: 'Abertas' },
    { chave: 'vencidas', rotulo: 'Vencidas', icone: 'heroicons_outline:exclamation-triangle', status: 'abertas', prazo: 'vencidas', campo: 'Vencidas' },
    { chave: 'vencendo', rotulo: 'Vencendo', icone: 'heroicons_outline:clock', status: 'abertas', prazo: 'vencendo', campo: 'Vencendo' },
    { chave: 'concluidas', rotulo: 'Concluídas', icone: 'heroicons_outline:check-circle', status: '3', prazo: 'todos', campo: 'Concluidas' },
    { chave: 'ignoradas', rotulo: 'Ignoradas', icone: 'heroicons_outline:eye-slash', status: '4', prazo: 'todos', campo: 'Ignoradas' },
];

/** Filtro rápido que corresponde ao par status + prazo da query; qualquer outra combinação = nenhum (null). */
export function filtroRapidoAtual(status: string, prazo: string): FiltroRapido | null {
    return FILTROS_RAPIDOS.find(f => f.status === status && f.prazo === prazo) ?? null;
}

// ---- Contagem de pendências de um evento (ficha) ----
// Espelha a regra da API: abertas = A fazer ou Em andamento; total = tudo que não está Ignorada; feitas = total - abertas.

export interface ContagemPendencias {
    abertas: number;
    total: number;
    feitas: number;
}

export function contarPendencias(lista: { EVP_STATUS: number }[] | null | undefined): ContagemPendencias {
    const itens = lista ?? [];
    const total = itens.filter(p => p.EVP_STATUS !== StatusPendencia.Ignorada).length;
    const abertas = itens.filter(p => p.EVP_STATUS === StatusPendencia.AFazer || p.EVP_STATUS === StatusPendencia.EmAndamento).length;
    return { abertas, total, feitas: total - abertas };
}
