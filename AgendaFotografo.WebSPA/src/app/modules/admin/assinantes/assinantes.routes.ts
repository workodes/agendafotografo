import { Routes } from '@angular/router';
import { assinanteDetailsResolver, assinanteListResolver } from 'app/resolvers/assinante.resolver';
import { AssinanteDetailsComponent } from './assinante-details/assinante-details.component';
import { AssinanteIndexComponent } from './assinante-index/assinante-index.component';

export default [
    {
        path: '',
        component: AssinanteIndexComponent,
        resolve: { data: assinanteListResolver },
        children: [
            { path: 'novo', component: AssinanteDetailsComponent },
            { path: ':id', component: AssinanteDetailsComponent, resolve: { data: assinanteDetailsResolver } },
        ],
    },
] as Routes;
