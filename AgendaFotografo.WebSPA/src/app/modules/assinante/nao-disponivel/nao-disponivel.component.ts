import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ROTA_AGENDA_ASSINANTE } from 'app/core/services/plano-modulo.service';
import { MODULO_PLANO_ROTULO } from 'app/models/enums/ModuloPlano';
import { Subject, takeUntil } from 'rxjs';

// Plano 24: tela de quem abre um módulo que o plano não libera (rota /assinante/nao-disponivel?modulo=N, sem item de menu).
// Sem link de contato (decisão do colaborador): só o texto e o botão para a Agenda.
@Component({
    standalone: true,
    selector: 'nao-disponivel',
    host: { class: 'flex flex-col flex-auto w-full min-w-0' },
    imports: [MatButtonModule, MatIconModule, RouterLink],
    template: `
        <div class="flex flex-auto items-center justify-center p-6 sm:p-10">
            <div class="flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl bg-card p-8 text-center shadow">
                <span class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700" aria-hidden="true">
                    <mat-icon class="icon-size-8 text-current" svgIcon="heroicons_outline:lock-closed"></mat-icon>
                </span>
                <h1 class="text-2xl font-extrabold leading-tight tracking-tight text-accent-900">{{ titulo }}</h1>
                <p class="text-secondary">Fale com o quemclica para liberar.</p>
                <a mat-flat-button color="primary" class="mt-2" [routerLink]="rotaAgenda">
                    <mat-icon svgIcon="heroicons_outline:calendar-days"></mat-icon>
                    <span class="ml-2">Ir para a agenda</span>
                </a>
            </div>
        </div>
    `,
})
export class NaoDisponivelComponent implements OnInit, OnDestroy {
    readonly rotaAgenda = ROTA_AGENDA_ASSINANTE;
    titulo = 'Este recurso não está disponível no seu plano.';
    private _destroy$ = new Subject<void>();

    constructor(private _route: ActivatedRoute, private _title: Title) { }

    ngOnInit(): void {
        this._title.setTitle('Não disponível');
        this._route.queryParamMap.pipe(takeUntil(this._destroy$)).subscribe(q => {
            const nome = MODULO_PLANO_ROTULO[Number(q.get('modulo'))];
            this.titulo = nome ? `${nome} não está disponível no seu plano.` : 'Este recurso não está disponível no seu plano.';
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }
}
