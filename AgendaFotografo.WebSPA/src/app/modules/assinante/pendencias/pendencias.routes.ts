import { Routes } from '@angular/router';
import { pendenciaOpcoesResolver } from 'app/resolvers/pendencia.resolver';
import { PendenciaIndexComponent } from './pendencia-index/pendencia-index.component';

// Os filtros ficam na query string (?status=&prioridade=&membroId=&prazo=), escrita pela própria tela. O resolver traz só as
// opções do filtro e roda ao entrar na rota (não a cada mudança de query); as pendências são carregadas pelo componente.
export default [
    {
        path: '',
        component: PendenciaIndexComponent,
        resolve: { data: pendenciaOpcoesResolver },
    },
] as Routes;
