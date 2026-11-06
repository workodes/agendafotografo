import { CommonModule } from '@angular/common';
import { Component, inject, computed, input, Optional, output, ViewChild, DoCheck, } from '@angular/core';
import { ControlValueAccessor, FormControl, ReactiveFormsModule, NgControl, } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelect, MatSelectChange, MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { startWith } from 'rxjs/operators';
import { CustomOptionsSelect } from './custom-options-select.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from "@angular/material/icon";
import { MatOptionSelectionChange } from '@angular/material/core';

@Component({
    selector: 'custom-search-select',
    template: `
        <mat-form-field
            class="w-full"
            [class.fuse-mat-rounded]="dense()"
            [class.fuse-mat-dense]="dense()"
            [floatLabel]="floatLabelAlways() ? 'always' : 'auto'"
            [appearance]="outline() ? 'outline' : 'fill'"
        >
            @if(label()) {
                <mat-label>{{ label() }}</mat-label>
            }
            
            @if(textHint()) {
            <mat-hint (click)="onClickHint()">
                <span class="hover:text-primary cursor-pointer">EDITAR</span>
            </mat-hint>
            }
            
            @if(enableIcon()) {
                <mat-icon matPrefix>list</mat-icon>
            }

            <!-- NÃO adicione [formControl] aqui: o CVA já controla o valor via [value]="mappedValue"
                 (que traduz null pro emptySentinel abaixo). Um [formControl] direto no mat-select usa
                 o valor bruto do FormControl (que pode ser null) em vez do mappedValue, e nenhuma
                 mat-option bate com null — o select fica em branco. Isso já aconteceu 2x. -->
            <mat-select
                [value]="mappedValue"
                [multiple]="multiple()"
                [disabled]="disabled"
                (selectionChange)="onSelectionChange($event)"
            >
                <mat-option>
                    <ngx-mat-select-search
                        [noEntriesFoundLabel]="'Nenhuma opção encontrada'"
                        [formControl]="filterControl"
                        [placeholderLabel]="placeholder()"
                    ></ngx-mat-select-search>
                </mat-option>

                @if(!multiple()) {
                    <mat-option [value]="emptySentinel">
                        {{ emptyOptionLabel() }}
                    </mat-option>
                }

                <mat-option
                    *ngFor="let option of filteredOptions()"
                    [value]="option.value"
                    (onSelectionChange)="onSelect($event, option.value)"
                >
                    {{ option.display }}
                </mat-option>
            </mat-select>
            <mat-error *ngIf="ngControl?.hasError('required') && ngControl?.touched">
                Campo <strong>obrigatório.</strong>
            </mat-error>
        </mat-form-field>
    `,
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        NgxMatSelectSearchModule,
        MatIcon
    ],
})
export class CustomSearchSelectComponent implements ControlValueAccessor, DoCheck {
    // O <mat-select> interno não tem formControlName (ver comentário no template), então nunca
    // recebe seu próprio NgControl e o Angular Material nunca chama updateErrorState() sozinho
    // (MatSelect.ngDoCheck só faz isso quando this.ngControl existe) — o que faz o mat-error
    // nunca aparecer mesmo com o campo required. Sincronizamos o errorState manualmente aqui
    // a partir do NgControl real (o do custom-search-select, ligado via formControlName no pai).
    @ViewChild(MatSelect) private matSelect?: MatSelect;

    ngDoCheck(): void {
        if (!this.matSelect) return;

        const shouldError = !!(this.ngControl?.invalid && this.ngControl?.touched);
        if (this.matSelect.errorState !== shouldError) {
            this.matSelect.errorState = shouldError;
            this.matSelect.stateChanges.next();
        }
    }

    readonly options = input<CustomOptionsSelect[]>([]);
    readonly placeholder = input('Pesquisar...');
    readonly label = input<string>();
    readonly emptyOptionLabel = input('Selecione');
    readonly multiple = input(false);
    readonly enableIcon = input(false);
    readonly outline = input(false);
    // Visual das telas do projeto: aplica fuse-mat-rounded + fuse-mat-dense no mat-form-field interno.
    readonly dense = input(false);
    // Rótulo sempre flutuando (floatLabel="always"), como nos demais campos das telas.
    readonly floatLabelAlways = input(false);
    readonly onSelectOption = output<{
        event: MatOptionSelectionChange;
        value: string;
    }>();
    readonly textHint = input<string>();
    readonly clickHint = output<void>();

    readonly ngControl = inject(NgControl, { self: true, optional: true });
    value: string | string[] | null = null;
    disabled = false;

    // mat-select trata null/undefined como "sem seleção" internamente e nunca exibe o texto de
    // uma mat-option cujo value seja null — por isso usamos um sentinela só aqui dentro pra
    // representar "nenhum valor selecionado" de um jeito que o mat-select consiga exibir.
    readonly emptySentinel = '__CUSTOM_SELECT_EMPTY__';

    get mappedValue(): any {
        return this.value === null ? this.emptySentinel : this.value;
    }

    readonly filterControl = new FormControl('', { nonNullable: true });
    readonly search = toSignal(this.filterControl.valueChanges.pipe(startWith('')), { initialValue: '' });

    readonly filteredOptions = computed(() => {
        const search = this.search().trim().toLowerCase();

        if (!search)
            return this.options();

        return this.options().filter(option => option.display.toLowerCase().includes(search));
    });

    constructor() {
        if (this.ngControl)
            this.ngControl.valueAccessor = this;
    }

    private onChange = (_: any) => { };
    private onTouched = () => { };

    writeValue(value: string | string[] | null): void {
        this.value = value;
    }
    registerOnChange(fn: (value: string | string[] | null) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }


    onSelect(event: MatOptionSelectionChange, value: string) {
        this.onSelectOption.emit({ event, value, });
    }

    onSelectionChange(event: MatSelectChange) {
        this.value = event.value === this.emptySentinel ? null : event.value;
        this.onChange(this.value);
        this.onTouched();
    }

    onClickHint() {
        this.clickHint.emit();
    }
}
