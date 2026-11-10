import { Routes } from '@angular/router';
import { eventoFichaResolver } from 'app/resolvers/evento.resolver';
import { EventoDetailsComponent } from './evento-details/evento-details.component';

// A ficha do evento é uma página inteira (não um drawer): `novo` e `:id` são rotas próprias.
// A antiga lista paginada saiu: `/assinante/eventos` redireciona para a Agenda.
export default [
    { path: '', pathMatch: 'full', redirectTo: '/assinante/agenda' },
    // runGuardsAndResolvers 'always': o assistente pode abrir o formulário já estando em /novo (ou /novo?data=); a ficha precisa reler o estado.
    { path: 'novo', component: EventoDetailsComponent, runGuardsAndResolvers: 'always', resolve: { data: eventoFichaResolver } },
    { path: ':id', component: EventoDetailsComponent, resolve: { data: eventoFichaResolver } },
] as Routes;
