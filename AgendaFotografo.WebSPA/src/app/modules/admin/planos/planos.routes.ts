import { Routes } from '@angular/router';
import { planoDetailsResolver, planoListResolver } from 'app/resolvers/plano.resolver';
import { PlanoDetailsComponent } from './plano-details/plano-details.component';
import { PlanoIndexComponent } from './plano-index/plano-index.component';

// Planos (Admin, plano 24): lista com a ficha no MatDrawer (`novo` e `:id`).
export default [
    {
        path: '',
        component: PlanoIndexComponent,
        resolve: { data: planoListResolver },
        children: [
            { path: 'novo', component: PlanoDetailsComponent, resolve: { data: planoDetailsResolver } },
            { path: ':id', component: PlanoDetailsComponent, resolve: { data: planoDetailsResolver } },
        ],
    },
] as Routes;
