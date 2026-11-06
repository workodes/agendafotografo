import { Routes } from '@angular/router';
import { pendenciaModeloFichaResolver, pendenciaModeloListResolver } from 'app/resolvers/pendencia-modelo.resolver';
import { ChecklistDetailsComponent } from './checklist-details/checklist-details.component';
import { ChecklistIndexComponent } from './checklist-index/checklist-index.component';

export default [
    {
        path: '',
        component: ChecklistIndexComponent,
        resolve: { data: pendenciaModeloListResolver },
        children: [
            { path: 'novo', component: ChecklistDetailsComponent, resolve: { data: pendenciaModeloFichaResolver } },
            { path: ':id', component: ChecklistDetailsComponent, resolve: { data: pendenciaModeloFichaResolver } },
        ],
    },
] as Routes;
