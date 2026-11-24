// Filtro da lista e do resumo de lançamentos. dataDe/dataAte "yyyy-MM-dd" (ambas ou nenhuma; "Tudo" = sem datas).
export interface LancamentoFiltro {
    busca?: string | null;
    dataDe?: string | null;
    dataAte?: string | null;
    // 'data' (padrão) | 'valor' | 'titulo'
    ordenar?: string;
    // 'desc' (padrão) | 'asc'
    sentido?: string;
}
