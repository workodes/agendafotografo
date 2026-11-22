/* eslint-disable @typescript-eslint/naming-convention */
// Item da agenda do Fotógrafo vindo da escala de um coordenador (somente leitura). Datas "yyyy-MM-dd", hora "HH:mm:ss" ou null.
export class EscalaItem {
    EventoId: string;
    EVE_NOME: string;
    EVE_DATA: string;
    EVE_HORA?: string | null;
    EVE_CIDADE: string;
    EVE_LOCAL?: string | null;
    Cancelado: boolean;
    EVM_POSICAO?: string | null;
    CoordenadorNome: string;
}
