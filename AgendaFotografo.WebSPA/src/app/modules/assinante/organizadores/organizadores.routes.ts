import { Routes } from '@angular/router';
import { organizadorDetailsResolver, organizadorListResolver } from 'app/resolvers/organizador.resolver';
import { OrganizadorDetailsComponent } from './organizador-details/organizador-details.component';
import { OrganizadorIndexComponent } from './organizador-index/organizador-index.component';

export default [
    {
        path: '',
        component: OrganizadorIndexComponent,
        resolve: { data: organizadorListResolver },
        children: [
            { path: 'novo', component: OrganizadorDetailsComponent },
            { path: ':id', component: OrganizadorDetailsComponent, resolve: { data: organizadorDetailsResolver } },
        ],
    },
] as Routes;
