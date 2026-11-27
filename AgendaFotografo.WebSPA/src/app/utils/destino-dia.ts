import { Params } from '@angular/router';
import { mesDaData } from './calendario';

export interface DestinoDia {
    comandos: unknown[];
    queryParams: Params;
}

/**
 * Destino dos links que falam de um dia (Ver o dia, cartões Hoje/Amanhã do Início, aviso de conflito). Plano 24: com o módulo
 * Visão da semana, a Visão do dia; sem ele, a Agenda no mês e no dia (sem data: a Agenda do mês atual).
 */
export function destinoDoDia(data: string | null | undefined, visaoLiberada: boolean): DestinoDia {
    if (visaoLiberada) {
        return { comandos: ['/assinante/visao-do-dia'], queryParams: data ? { data, visao: 'dia' } : { visao: 'dia' } };
    }
    const mes = mesDaData(data);
    return { comandos: ['/assinante/agenda'], queryParams: mes ? { mes, dia: data } : {} };
}
