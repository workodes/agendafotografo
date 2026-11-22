import { Routes } from '@angular/router';
import { eventoPessoalFichaResolver } from 'app/resolvers/evento-pessoal.resolver';
import { EventoPessoalDetailsComponent } from './evento-pessoal-details/evento-pessoal-details.component';

// A ficha do evento pessoal é uma página inteira (não um drawer): `novo` e `:id` são rotas próprias.
export default [
    { path: '', pathMatch: 'full', redirectTo: '/fotografo/agenda' },
    // runGuardsAndResolvers 'always': `novo?data=` precisa reler a query ao reaproveitar a rota.
    { path: 'novo', component: EventoPessoalDetailsComponent, runGuardsAndResolvers: 'always', resolve: { data: eventoPessoalFichaResolver } },
    { path: ':id', component: EventoPessoalDetailsComponent, resolve: { data: eventoPessoalFichaResolver } },
] as Routes;
