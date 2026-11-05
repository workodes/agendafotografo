import { Routes } from '@angular/router';
import { EventoPublicoComponent } from './evento-publico.component';

// Link público do evento (/e/:token). Rota anônima, mobile-first. Implementação virá no plano "Link público".
export default [
    {
        path: '',
        component: EventoPublicoComponent,
    },
] as Routes;
