import { CommonModule } from '@angular/common';
import {
    Component,
    computed,
    inject,
    input,
    output,
} from '@angular/core';
import {
    ControlValueAccessor,
    FormControl,
    NgControl,
    ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { CustomOptionsGroupSelect } from './custom-options-group-select.model';
import { MatIcon } from "@angular/material/icon";

@Component({
    host: { class: 'relative' },
    selector: 'app-custom-group-select',
    standalone: true,
    imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    MatIcon
],
    templateUrl: './custom-group-select.component.html',
})
export class CustomGroupSelectComponent implements ControlValueAccessor {
    readonly options = input.required<CustomOptionsGroupSelect[]>();
    readonly placeholder = input('Pesquisar...');
    readonly label = input<string>();
    readonly outline = input(false);
    readonly selectionChange = output<string>();

    value = '';
    disabled = false;

    readonly ngControl = inject(NgControl, { self: true });
    readonly filterControl = new FormControl('', { nonNullable: true });
    readonly search = toSignal(this.filterControl.valueChanges.pipe(startWith('')), { initialValue: '' });

    readonly filteredOptions = computed(() => {
        const search = this.search().trim().toLowerCase();

        if (!search)
            return this.options();

        return this.options()
            .map(group => ({ ...group, options: group.options.filter(option => option.display.toLowerCase().includes(search)) }))
            .filter(group => group.display.toLowerCase().includes(search) || group.options.length > 0);
    });

    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };

    constructor() {
        if (this.ngControl)
            this.ngControl.valueAccessor = this;
    }

    writeValue(value: string | null): void {
        this.value = value ?? '';
    }
    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    handleValueChange(value: string): void {
        this.value = value;

        this.onChange(value);
        this.selectionChange.emit(value);
    }

    handleClosed(): void {
        this.onTouched();
    }
}
