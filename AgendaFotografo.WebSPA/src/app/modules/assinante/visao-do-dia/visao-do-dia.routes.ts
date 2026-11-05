import { Routes } from '@angular/router';
import { eventoDiaResolver } from 'app/resolvers/evento.resolver';
import { VisaoDoDiaComponent } from './visao-do-dia.component';

// A data vem em ?data=yyyy-MM-dd; mudar a query refaz a carga.
export default [
    {
        path: '',
        component: VisaoDoDiaComponent,
        resolve: { data: eventoDiaResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    },
] as Routes;
