import { MatPaginatorIntl } from "@angular/material/paginator";

export function configPaginator(paginator: MatPaginatorIntl) {
    paginator.itemsPerPageLabel = 'Itens por página';
    paginator.nextPageLabel = 'Próxima';
    paginator.previousPageLabel = 'Anterior';
    paginator.firstPageLabel = 'Primeira Página';
    paginator.lastPageLabel = 'Última Página';
    paginator.getRangeLabel = getRangeLabel;
}

function getRangeLabel(page: number, pageSize: number, length: number): string {
    if (length === 0 || pageSize === 0) {
        return `Nenhum dado`;
    }

    const startIndex = page * pageSize + 1;
    const endIndex = Math.min(startIndex + pageSize - 1, length);

    return `${startIndex} a ${endIndex} de ${length}`;
}
