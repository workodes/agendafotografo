import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';

/** Dados do modal. `obrigatorio`: troca exigida no login (sem Cancelar, só "Sair"; o chamador define `disableClose`). */
export interface AlterarSenhaDialogData {
    obrigatorio?: boolean;
}

// A nova senha não pode ser igual à atual (a API também recusa; aqui evita a ida ao servidor).
function novaDiferenteDaAtual(control: AbstractControl): ValidationErrors | null {
    const atual = control.parent?.get('SenhaAtual')?.value;
    return control.value && atual && control.value === atual ? { igualAtual: true } : null;
}

@Component({
    selector: 'app-alterar-senha-dialog',
    standalone: true,
    templateUrl: './alterar-senha-dialog.component.html',
    imports: [
        NgIf,
        ReactiveFormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
    ],
})
export class AlterarSenhaDialogComponent {
    private _fb = inject(FormBuilder);
    private _dialogRef = inject(MatDialogRef<AlterarSenhaDialogComponent>);
    private _authService = inject(AuthService);
    private _snackBar = inject(MatSnackBar);
    private _router = inject(Router);

    readonly obrigatorio = inject<AlterarSenhaDialogData | null>(MAT_DIALOG_DATA, { optional: true })?.obrigatorio === true;

    saving = false;
    mostrarAtual = false;
    mostrarNova = false;

    form = this._fb.group({
        SenhaAtual: ['', Validators.required],
        NovaSenha: ['', [Validators.required, Validators.minLength(8), novaDiferenteDaAtual]],
    });

    constructor() {
        // Ao mudar a senha atual, reavalia "nova ≠ atual".
        this.form.get('SenhaAtual')!.valueChanges.subscribe(() => this.form.get('NovaSenha')!.updateValueAndValidity());
    }

    /** Troca obrigatória: encerra a sessão e volta ao login. */
    sair(): void {
        this._authService.signOut();
        this._dialogRef.close();
        this._router.navigate(['/sign-in']);
    }

    cancelar(): void {
        this._dialogRef.close();
    }

    salvar(): void {
        if (this.saving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving = true;
        this._authService.AlterarSenha(this.form.getRawValue() as { SenhaAtual: string; NovaSenha: string }).subscribe({
            next: response => {
                // Qualquer troca bem-sucedida zera o flag no servidor; o SPA acompanha.
                this._authService.ConcluirTrocaSenha();
                this._snackBar.open(response?.Message ?? 'Senha alterada com sucesso.', 'X', { duration: 3000 });
                this._dialogRef.close(true);
            },
            error: error => {
                this.saving = false;
                // O 400 vem em texto puro, com uma ou mais mensagens separadas por \n.
                this._snackBar.open(typeof error?.error === 'string' && error.error
                    ? error.error
                    : 'Não foi possível alterar a senha. Tente novamente.', 'X', { duration: 6000 });
            },
        });
    }
}
