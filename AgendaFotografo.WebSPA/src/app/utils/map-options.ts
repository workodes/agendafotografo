import { CustomOptionsSelect } from 'app/modules/shared/components/custom-select/custom-options-select.model';

// Converte listas da API em opções do custom-select. Crie uma função por entidade usada em selects.
// Exemplo:
//   export function mapExemplosOptions(exemplos: Exemplo[]) {
//       return exemplos.map(e => new CustomOptionsSelect(e.Id, e.EXE_NOME));
//   }
export function mapOptions<T extends { Id?: string }>(itens: T[], texto: (item: T) => string): CustomOptionsSelect[] {
    return itens.map(item => new CustomOptionsSelect(item.Id, texto(item)));
}
