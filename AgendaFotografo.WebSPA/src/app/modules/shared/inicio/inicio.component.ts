import { Component, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { UsuarioService } from 'app/core/services/usuario.service';

// Página inicial de todos os perfis após o login. Será substituída pelo Painel do assinante (lembretes e próximos 7 dias) e pelo painel do Admin nos respectivos planos.
@Component({
    selector: 'app-inicio',
    standalone: true,
    template: `
        <div class="flex flex-col items-center justify-center w-full h-full p-8 gap-4 text-center">
            <img src="assets/images/logo/logo.png" class="w-56" alt="AgendaFotografo">
            <h1 class="text-3xl font-bold text-primary">Bem-vindo{{ nome() ? ', ' + nome() : '' }}</h1>
            <p class="text-secondary">Use o menu para navegar pelo sistema.</p>
        </div>
    `,
})
export class InicioComponent implements OnInit {
    private readonly usuarioService = inject(UsuarioService);
    nome = signal<string>('');

    constructor(titleService: Title) {
        titleService.setTitle('Início');
    }

    ngOnInit(): void {
        this.usuarioService.usuario$.subscribe(u => this.nome.set(u?.FullName?.split(' ')[0] ?? ''));
    }
}
