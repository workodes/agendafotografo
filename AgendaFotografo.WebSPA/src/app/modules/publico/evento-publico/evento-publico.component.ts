import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';

// Placeholder da página pública do evento. Fica fora do layout autenticado (sem menu, sem guards).
// O token da URL será usado pela tela de código de 4 dígitos no plano "Link público".
@Component({
    selector: 'app-evento-publico',
    standalone: true,
    template: `
        <div class="flex flex-col items-center justify-center min-h-screen w-full p-6 gap-4 text-center">
            <img src="assets/images/logo/logo.png" class="w-48" alt="AgendaFotografo">
            <h1 class="text-2xl font-bold text-primary">Página do evento</h1>
            <p class="text-secondary">Esta página estará disponível em breve.</p>
        </div>
    `,
})
export class EventoPublicoComponent {
    readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token');

    constructor(titleService: Title) {
        titleService.setTitle('Evento');
    }
}
