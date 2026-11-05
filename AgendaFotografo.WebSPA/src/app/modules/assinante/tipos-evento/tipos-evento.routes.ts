import { Routes } from '@angular/router';
import { tipoEventoDetailsResolver, tipoEventoListResolver } from 'app/resolvers/tipo-evento.resolver';
import { TipoEventoDetailsComponent } from './tipo-evento-details/tipo-evento-details.component';
import { TipoEventoIndexComponent } from './tipo-evento-index/tipo-evento-index.component';

export default [
    {
        path: '',
        component: TipoEventoIndexComponent,
        resolve: { data: tipoEventoListResolver },
        children: [
            { path: 'novo', component: TipoEventoDetailsComponent },
            { path: ':id', component: TipoEventoDetailsComponent, resolve: { data: tipoEventoDetailsResolver } },
        ],
    },
] as Routes;
