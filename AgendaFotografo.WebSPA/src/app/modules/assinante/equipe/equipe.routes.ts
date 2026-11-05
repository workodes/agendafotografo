import { Routes } from '@angular/router';
import { membroDetailsResolver, membroListResolver } from 'app/resolvers/membro.resolver';
import { MembroDetailsComponent } from './membro-details/membro-details.component';
import { MembroIndexComponent } from './membro-index/membro-index.component';

export default [
    {
        path: '',
        component: MembroIndexComponent,
        resolve: { data: membroListResolver },
        children: [
            { path: 'novo', component: MembroDetailsComponent },
            { path: ':id', component: MembroDetailsComponent, resolve: { data: membroDetailsResolver } },
        ],
    },
] as Routes;
