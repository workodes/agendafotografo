/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/TipoArquivoEvento.cs. Os valores numéricos fazem parte do contrato com a API.
export enum TipoArquivoEvento {
    Flyer = 1,
    ImagemRota = 2,
    Gpx = 3,
}

export const TIPO_ARQUIVO_EVENTO_ROTULO: Record<number, string> = {
    [TipoArquivoEvento.Flyer]: 'Flyer',
    [TipoArquivoEvento.ImagemRota]: 'Imagem do percurso',
    [TipoArquivoEvento.Gpx]: 'GPX',
};

// Regras de upload (a API valida de novo): imagens .jpg/.jpeg/.png/.webp até 5 MB; GPX .gpx até 10 MB.
export const TIPO_ARQUIVO_EVENTO_REGRAS: Record<number, { extensoes: string[]; maxBytes: number; maxRotulo: string }> = {
    [TipoArquivoEvento.Flyer]: { extensoes: ['.jpg', '.jpeg', '.png', '.webp'], maxBytes: 5 * 1024 * 1024, maxRotulo: '5 MB' },
    [TipoArquivoEvento.ImagemRota]: { extensoes: ['.jpg', '.jpeg', '.png', '.webp'], maxBytes: 5 * 1024 * 1024, maxRotulo: '5 MB' },
    [TipoArquivoEvento.Gpx]: { extensoes: ['.gpx'], maxBytes: 10 * 1024 * 1024, maxRotulo: '10 MB' },
};
