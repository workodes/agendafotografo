/* eslint-disable @typescript-eslint/naming-convention */
import { GravidadeAviso } from 'app/models/enums/GravidadeAviso';
import { TipoAviso } from 'app/models/enums/TipoAviso';

// Um aviso de api/Aviso/Listar. O texto vem pronto da API; o front só monta o destino (utils/aviso.ts) e não recalcula regra nenhuma.
export class AvisoItem {
    Chave: string; // estável: use no trackBy
    Tipo: TipoAviso;
    Gravidade: GravidadeAviso;
    Titulo: string;
    Descricao: string;
    Detalhes: string[];
    Quantidade: number; // nos avisos agrupados (e nº de eventos no conflito)
    EventoId?: string | null;
    Data?: string | null; // "yyyy-MM-dd"
    MembroId?: string | null;
}
