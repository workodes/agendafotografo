import { Routes } from '@angular/router';
import { assinanteDetailsResolver, assinanteListResolver, assinanteNovoResolver } from 'app/resolvers/assinante.resolver';
import { AssinanteDetailsComponent } from './assinante-details/assinante-details.component';
import { AssinanteIndexComponent } from './assinante-index/assinante-index.component';

export default [
    {
        path: '',
        component: AssinanteIndexComponent,
        resolve: { data: assinanteListResolver },
        children: [
            { path: 'novo', component: AssinanteDetailsComponent, resolve: { data: assinanteNovoResolver } },
            { path: ':id', component: AssinanteDetailsComponent, resolve: { data: assinanteDetailsResolver } },
        ],
    },
] as Routes;
