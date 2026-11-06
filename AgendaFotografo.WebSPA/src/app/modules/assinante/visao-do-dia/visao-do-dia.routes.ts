import { Routes } from '@angular/router';
import { VisaoDoDiaComponent } from './visao-do-dia.component';

// Query: ?visao=semana|dia&data=yyyy-MM-dd (padrão: semana de hoje). O próprio componente lê a query e carrega (sem resolver).
export default [
    {
        path: '',
        component: VisaoDoDiaComponent,
    },
] as Routes;
