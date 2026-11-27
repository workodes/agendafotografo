/* eslint-disable @typescript-eslint/naming-convention */
// GET Plano/Modulos (plano 24): catálogo montado pela API a partir do enum ModuloPlano (módulo novo aparece sozinho).
export class ModulosCatalogo {
    Liberaveis: ModuloCatalogoItem[];
    /** O que todo plano tem, sem caixa na tela (só texto). */
    SempreLiberados: string[];
}

export class ModuloCatalogoItem {
    /** ModuloPlano. */
    Modulo: number;
    Nome: string;
    Descricao: string;
}
