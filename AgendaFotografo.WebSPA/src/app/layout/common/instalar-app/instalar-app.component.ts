import { NgIf } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

type Plataforma = 'prompt' | 'ios-safari' | 'ios-outro' | 'generico';

const CHAVE_VISTO = 'instalarApp.vistoNoSino';

/** true quando o sistema já roda como app instalado (sem barra do navegador). */
export function rodandoComoApp(): boolean {
    try {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.matchMedia('(display-mode: fullscreen)').matches
            || (navigator as any).standalone === true;
    } catch { return false; }
}

/** O convite ainda conta no sino: fora do app e o painel de avisos nunca foi aberto neste aparelho. */
export function instalarAppPendente(): boolean {
    if (rodandoComoApp()) return false;
    try { return !localStorage.getItem(CHAVE_VISTO); } catch { return false; }
}

/** Chamado ao abrir o painel do sino: dali em diante o convite fica no painel, mas sem contar no sino. */
export function marcarInstalarAppVisto(): void {
    try { localStorage.setItem(CHAVE_VISTO, '1'); } catch { }
}

/**
 * Convite "Use o Agenda Fotógrafo como aplicativo", mostrado como item no topo do painel do sino de avisos (não é mais faixa no cabeçalho).
 * Fica no painel enquanto o sistema roda no navegador comum e some sozinho dentro do app instalado. Conta 1 no sino só até a
 * primeira abertura do painel (ver `instalarAppPendente` / `marcarInstalarAppVisto`); depois fica lá, sem contar.
 */
@Component({
    selector: 'instalar-app',
    standalone: true,
    imports: [NgIf, MatButtonModule, MatIconModule],
    template: `
    <div *ngIf="visivel" class="flex items-start gap-3 px-4 py-3 bg-primary-50 border-b border-primary-200 text-primary-900" role="region" aria-label="Instalar o aplicativo">
        <mat-icon class="mt-0.5 shrink-0 text-primary-700" [svgIcon]="'heroicons_outline:device-phone-mobile'"></mat-icon>
        <div class="flex-auto min-w-0 text-sm">
            <div class="font-semibold">Use o Agenda Fotógrafo como aplicativo</div>
            <ng-container>
                <div *ngIf="plataforma === 'prompt'">Fica na tela inicial do celular e abre em tela cheia, sem a barra do navegador.</div>
                <ol *ngIf="plataforma === 'ios-safari'" class="mt-1 list-decimal pl-5 space-y-0.5">
                    <li>Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima) na barra do Safari.</li>
                    <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
                    <li>Toque em <strong>Adicionar</strong>. O ícone aparece junto dos seus apps.</li>
                </ol>
                <div *ngIf="plataforma === 'ios-outro'">No iPhone/iPad a instalação só funciona pelo <strong>Safari</strong>: abra este endereço nele, toque em Compartilhar e depois em <strong>Adicionar à Tela de Início</strong>.</div>
                <ol *ngIf="plataforma === 'generico'" class="mt-1 list-decimal pl-5 space-y-0.5">
                    <li>Abra o menu do navegador (<strong>&#8942;</strong>, três pontinhos).</li>
                    <li>Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                    <li>Confirme em <strong>Instalar</strong>.</li>
                </ol>
            </ng-container>
            <div *ngIf="plataforma === 'prompt'" class="mt-2">
                <button mat-flat-button color="primary" type="button" (click)="instalar()">Instalar agora</button>
            </div>
        </div>
    </div>`,
})
export class InstalarAppComponent implements OnInit {
    visivel = false;
    plataforma: Plataforma = 'generico';
    private _evento: any = null;

    ngOnInit(): void {
        this._evento = (window as any).__pwaPrompt ?? null;
        this.plataforma = this._evento ? 'prompt' : this.detectar();
        this.visivel = !rodandoComoApp();
    }

    @HostListener('window:beforeinstallprompt', ['$event'])
    aoPrompt(e: Event): void {
        e.preventDefault();
        this._evento = e;
        (window as any).__pwaPrompt = e;
        this.plataforma = 'prompt';
        this.visivel = !rodandoComoApp();
    }

    @HostListener('window:appinstalled')
    aoInstalar(): void { this.visivel = false; (window as any).__pwaPrompt = null; }

    async instalar(): Promise<void> {
        const e = this._evento ?? (window as any).__pwaPrompt;
        if (!e) { this.plataforma = 'generico'; return; }
        try {
            await e.prompt();
            const r = await e.userChoice;
            if (r?.outcome === 'accepted') this.visivel = false;
        } catch { this.plataforma = 'generico'; }
        this._evento = null;
        (window as any).__pwaPrompt = null;
    }

    private detectar(): Plataforma {
        if (this._evento) return 'prompt';
        const ua = navigator.userAgent || '';
        const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-outro' : 'ios-safari';
        return 'generico';
    }
}
