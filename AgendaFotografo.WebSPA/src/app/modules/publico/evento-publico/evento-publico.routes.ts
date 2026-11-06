import { Routes } from '@angular/router';
import { EventoPublicoComponent } from './evento-publico.component';

// Link público do evento (/e/:token). Rota anônima, mobile-first (plano 05).
export default [
    {
        path: '',
        component: EventoPublicoComponent,
    },
] as Routes;
