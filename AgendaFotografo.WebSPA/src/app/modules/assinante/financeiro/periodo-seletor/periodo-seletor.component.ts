import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { formatarDataIso, parseDataIso } from 'app/utils/data-evento';
import { calcularPeriodo, PERIODOS_FINANCEIRO, TipoPeriodo } from 'app/utils/periodo-financeiro';
import { FinanceiroFiltroService } from '../financeiro-filtro.service';

// Seletor de período do cabeçalho do Financeiro: Tudo, Hoje, Semana, Este mês, 3 meses, Este ano e Personalizado.
// Personalizado exige as duas datas (início <= fim); enquanto faltar uma, o período aplicado continua o anterior.
@Component({
    selector: 'app-periodo-seletor',
    standalone: true,
    imports: [NgFor, NgIf, ReactiveFormsModule, MatDatepickerModule, MatFormFieldModule, MatSelectModule],
    template: `
        <div class="flex flex-col sm:flex-row sm:items-start gap-2 w-full sm:w-auto">
            <mat-form-field appearance="fill" floatLabel="always" class="fuse-mat-dense fuse-mat-rounded w-full sm:w-44" subscriptSizing="dynamic">
                <mat-label>Período</mat-label>
                <mat-select [formControl]="tipo" aria-label="Período">
                    <mat-option *ngFor="let p of periodos" [value]="p.valor">{{ p.rotulo }}</mat-option>
                </mat-select>
            </mat-form-field>

            <mat-form-field *ngIf="tipo.value === 'personalizado'" appearance="fill" floatLabel="always"
                class="fuse-mat-dense fuse-mat-rounded w-full sm:w-72">
                <mat-label>Datas</mat-label>
                <mat-date-range-input [formGroup]="intervalo" [rangePicker]="picker" [min]="minimo" [max]="maximo">
                    <input matStartDate formControlName="inicio" placeholder="Início" autocomplete="off" aria-label="Data inicial">
                    <input matEndDate formControlName="fim" placeholder="Fim" autocomplete="off" aria-label="Data final">
                </mat-date-range-input>
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-date-range-picker #picker></mat-date-range-picker>
                <mat-hint *ngIf="!intervaloValido">Informe as duas datas.</mat-hint>
                <mat-error>{{ erroIntervalo }}</mat-error>
            </mat-form-field>
        </div>
    `,
})
export class PeriodoSeletorComponent implements OnInit {
    private _filtro = inject(FinanceiroFiltroService);
    private _destroyRef = inject(DestroyRef);

    readonly periodos = PERIODOS_FINANCEIRO;
    readonly minimo = new Date(2000, 0, 1);
    readonly maximo = new Date(2100, 11, 31);

    tipo = new FormControl<TipoPeriodo>(this._filtro.periodo.tipo, { nonNullable: true });
    intervalo = new FormGroup({
        inicio: new FormControl<Date | null>(null),
        fim: new FormControl<Date | null>(null),
    });

    ngOnInit(): void {
        const atual = this._filtro.periodo;
        if (atual.tipo === 'personalizado') {
            this.intervalo.setValue({ inicio: parseDataIso(atual.dataDe), fim: parseDataIso(atual.dataAte) }, { emitEvent: false });
        }

        this.tipo.valueChanges.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(tipo => {
            if (tipo === 'personalizado') {
                // Começa pelo período que já estava aplicado (se houver), para o usuário só ajustar.
                const p = this._filtro.periodo;
                this.intervalo.setValue({ inicio: parseDataIso(p.dataDe), fim: parseDataIso(p.dataAte) }, { emitEvent: false });
                this.aplicarIntervalo();
                return;
            }
            const periodo = calcularPeriodo(tipo);
            if (periodo) {
                this._filtro.Definir(periodo);
            }
        });

        this.intervalo.valueChanges.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => this.aplicarIntervalo());
    }

    get intervaloValido(): boolean {
        const { inicio, fim } = this.intervalo.value;
        return this.valida(inicio) && this.valida(fim);
    }

    get erroIntervalo(): string {
        const { inicio, fim } = this.intervalo.controls;
        if (inicio.errors?.['matStartDateInvalid']) {
            return 'A data inicial não pode ser maior que a data final.';
        }
        if (inicio.errors?.['matDatepickerMin'] || inicio.errors?.['matDatepickerMax'] || fim.errors?.['matDatepickerMin'] || fim.errors?.['matDatepickerMax']) {
            return 'Use datas entre 2000 e 2100.';
        }
        return 'Data inválida.';
    }

    private valida(d: Date | null | undefined): d is Date {
        return d instanceof Date && !isNaN(d.getTime());
    }

    private aplicarIntervalo(): void {
        if (this.tipo.value !== 'personalizado' || this.intervalo.invalid) {
            return;
        }
        const { inicio, fim } = this.intervalo.value;
        if (!this.valida(inicio) || !this.valida(fim)) {
            return;
        }
        const periodo = calcularPeriodo('personalizado', undefined, { dataDe: formatarDataIso(inicio), dataAte: formatarDataIso(fim) });
        if (periodo) {
            this._filtro.Definir(periodo);
        }
    }
}
