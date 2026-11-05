import { Routes } from '@angular/router';
import { eventoFichaResolver, eventoListResolver } from 'app/resolvers/evento.resolver';
import { EventoDetailsComponent } from './evento-details/evento-details.component';
import { EventoIndexComponent } from './evento-index/evento-index.component';

// A ficha do evento é uma página inteira (não um drawer): `novo` e `:id` são irmãs do index, não filhas.
// A lista recarrega ao mudar a query string (?organizadorId=, ?status= ...).
export default [
    {
        path: '',
        component: EventoIndexComponent,
        resolve: { data: eventoListResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    },
    { path: 'novo', component: EventoDetailsComponent, resolve: { data: eventoFichaResolver } },
    { path: ':id', component: EventoDetailsComponent, resolve: { data: eventoFichaResolver } },
] as Routes;
