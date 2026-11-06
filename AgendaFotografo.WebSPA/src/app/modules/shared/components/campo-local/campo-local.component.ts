import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LocalSugestao } from 'app/models/DTOs/responses/LocalSugestao';
import { LocalService } from 'app/services/local.service';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, takeUntil, tap } from 'rxjs';

/**
 * Campo de texto com sugestões de lugares (api/Local/Buscar, Geoapify). Continua aceitando texto livre: a sugestão só ajuda.
 * Ao escolher uma sugestão, grava no controle o Nome (modo "nome") ou o endereço completo (modo "endereco") e emite `escolhido`
 * com a sugestão inteira, para o formulário preencher cidade ou link do Maps.
 * Só busca quando o usuário digita (evento input), nunca quando o formulário é carregado por código.
 */
@Component({
    selector: 'app-campo-local',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
    template: `
        <mat-form-field appearance="fill" floatLabel="always" class="fuse-mat-rounded fuse-mat-dense w-full">
            <mat-label>{{ rotulo }}</mat-label>
            <input matInput [formControl]="controle" [attr.maxlength]="maxlength" autocomplete="off" [placeholder]="placeholder"
                [matAutocomplete]="auto" (input)="digitou($event)">
            <mat-progress-spinner *ngIf="buscando" matSuffix diameter="18" mode="indeterminate" class="mr-2"></mat-progress-spinner>
            <mat-icon *ngIf="!buscando" matSuffix class="icon-size-5 text-hint" svgIcon="heroicons_outline:map-pin"></mat-icon>
            <mat-autocomplete #auto="matAutocomplete" class="campo-local-painel">
                <mat-option *ngFor="let s of sugestoes" [value]="valorDe(s)" (onSelectionChange)="$event.isUserInput && escolher(s)">
                    <div class="flex flex-col leading-tight py-1 min-w-0">
                        <span class="font-medium truncate">{{ s.Nome }}</span>
                        <span class="text-xs text-secondary truncate">{{ s.Endereco }}</span>
                    </div>
                </mat-option>
            </mat-autocomplete>
            <mat-error *ngIf="erro">{{ erro }}</mat-error>
        </mat-form-field>
    `,
    styles: [`:host { display: block; } ::ng-deep .campo-local-painel .mat-mdc-option { min-height: 56px; }`],
})
export class CampoLocalComponent implements OnInit, OnDestroy {
    @Input({ required: true }) controle!: FormControl;
    @Input() rotulo = 'Local';
    @Input() placeholder = '';
    @Input() maxlength = 200;
    @Input() erro: string | null = null;
    /** "nome": grava só o nome do lugar (ex.: Parque Barigui); "endereco": grava o endereço completo. */
    @Input() modo: 'nome' | 'endereco' = 'nome';
    @Output() escolhido = new EventEmitter<LocalSugestao>();

    sugestoes: LocalSugestao[] = [];
    buscando = false;

    private readonly _texto = new Subject<string>();
    private readonly _destroy = new Subject<void>();

    constructor(private _localService: LocalService) { }

    ngOnInit(): void {
        this._texto.pipe(
            debounceTime(350),
            distinctUntilChanged(),
            tap(t => { if (t.length < 3) { this.sugestoes = []; } }),
            switchMap(t => {
                if (t.length < 3) {
                    return of(null);
                }
                this.buscando = true;
                return this._localService.Buscar(t).pipe(catchError(() => of([] as LocalSugestao[])));
            }),
            takeUntil(this._destroy),
        ).subscribe(r => {
            this.buscando = false;
            if (r) {
                this.sugestoes = r;
            }
        });
    }

    ngOnDestroy(): void {
        this._destroy.next();
        this._destroy.complete();
    }

    digitou(ev: Event): void {
        this._texto.next(((ev.target as HTMLInputElement).value ?? '').trim());
    }

    valorDe(s: LocalSugestao): string {
        const v = this.modo === 'endereco' ? s.Endereco : s.Nome;
        return v.length > this.maxlength ? v.slice(0, this.maxlength) : v;
    }

    escolher(s: LocalSugestao): void {
        this.controle.markAsDirty();
        this.escolhido.emit(s);
    }
}
