import { CustomOptionsSelect } from 'app/modules/shared/components/custom-select/custom-options-select.model';

// Converte uma lista em opções do custom-search-select, reaproveitando o resultado enquanto a lista
// de origem for a mesma referência (um getter no template não pode devolver um array novo a cada ciclo).
export class OpcoesSelect<T> {
    private _origem: T[] | null = null;
    private _opcoes: CustomOptionsSelect[] = [];

    constructor(private _valor: (item: T) => any, private _rotulo: (item: T) => string) { }

    de(lista: T[]): CustomOptionsSelect[] {
        if (lista !== this._origem) {
            this._origem = lista;
            this._opcoes = lista.map(i => new CustomOptionsSelect(this._valor(i), this._rotulo(i)));
        }
        return this._opcoes;
    }
}
