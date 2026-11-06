import { Routes } from '@angular/router';
import { agendaOpcoesResolver } from 'app/resolvers/agenda.resolver';
import { AgendaComponent } from './agenda.component';

// O mês, a visão, os filtros e o dia ficam na query string, escrita pela própria tela. O resolver traz só as opções dos
// filtros e roda ao entrar na rota (não a cada mudança de query); os eventos são carregados pelo componente.
export default [
    {
        path: '',
        component: AgendaComponent,
        resolve: { data: agendaOpcoesResolver },
    },
] as Routes;
