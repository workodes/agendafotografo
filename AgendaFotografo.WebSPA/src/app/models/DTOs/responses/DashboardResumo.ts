/* eslint-disable @typescript-eslint/naming-convention */
import { DiaMembroLivreItem } from './DiaResponse';
import { EventoResumo } from './EventoResumo';

// Espelha AgendaFotografo.WebApi/Models/Dashboard (plano 17). Datas "yyyy-MM-dd".
export class DashboardStatusContagem {
    Pendentes: number;
    Confirmados: number;
    Realizados: number;
    Cancelados: number;
    NaoCancelados: number; // Pendentes + Confirmados + Realizados
}

export class DashboardDistribuicaoItem {
    Id: string | null; // null em PorCidade
    Nome: string;
    Quantidade: number;
}

export class DashboardDistribuicao {
    Itens: DashboardDistribuicaoItem[];
    Outros: number;
    Total: number;
}

export class DashboardMembroItem {
    Id: string; // Id do membro
    MEM_NOME: string;
    MEM_INSTAGRAM?: string | null;
    MEM_FUNCAO: number;
    MEM_ATIVO: boolean;
    Quantidade: number;
}

export class DashboardSemEquipe {
    Dias: number;
    Quantidade: number;
    Eventos: EventoResumo[];
}

export class DashboardLivresHoje {
    Quantidade: number;
    TotalAtivos: number;
    Membros: DiaMembroLivreItem[];
}

export class DashboardResumo {
    Hoje: string;
    MesDe: string;
    MesAte: string;
    MesAnteriorDe: string;
    MesAnteriorAte: string;
    Mes: DashboardStatusContagem;
    MesAnterior: DashboardStatusContagem;
    PorTipo: DashboardDistribuicao;
    PorCidade: DashboardDistribuicao;
    PorOrganizador: DashboardDistribuicao;
    SemOrganizador: number;
    MaisEscalados: DashboardMembroItem[];
    SemEquipe: DashboardSemEquipe;
    LivresHoje: DashboardLivresHoje;
}
