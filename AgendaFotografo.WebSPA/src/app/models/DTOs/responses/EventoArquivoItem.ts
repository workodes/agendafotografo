/* eslint-disable @typescript-eslint/naming-convention */
// EVA_TIPO é o enum TipoArquivoEvento (1 Flyer, 2 ImagemRota, 3 Gpx). O caminho em disco nunca sai da API.
export class EventoArquivoItem {
    Id: string;
    EVA_TIPO: number;
    EVA_NOME_ORIGINAL: string;
    EVA_CONTENT_TYPE: string;
    EVA_TAMANHO: number;
}
