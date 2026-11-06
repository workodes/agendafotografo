import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Organizador } from 'app/models/entities/Organizador';
import { OrganizadorService } from 'app/services/organizador.service';
import { emailTolerante, normalizarEmail } from 'app/utils/email-validator';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { instagramValido, limparInstagram, somenteDigitos } from 'app/utils/organizador-form';

// Cadastro rápido de organizador (usado no cadastro de evento). Fecha devolvendo o Organizador criado; cancelar devolve undefined.
@Component({
    standalone: true,
    selector: 'organizador-dialog',
    templateUrl: './organizador-dialog.component.html',
    providers: [provideNgxMask()],
    imports: [CommonModule, ReactiveFormsModule, NgxMaskDirective, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
})
export class OrganizadorDialogComponent {
    form: FormGroup;
    salvando = false;

    constructor(
        private _fb: FormBuilder,
        private _dialogRef: MatDialogRef<OrganizadorDialogComponent, Organizador>,
        private _service: OrganizadorService,
        private _snackBar: MatSnackBar,
    ) {
        this.form = this._fb.group({
            ORG_NOME: ['', [Validators.required, Validators.maxLength(200)]],
            ORG_CONTATO: ['', [Validators.maxLength(150)]],
            ORG_EMAIL: ['', [emailTolerante, Validators.maxLength(200)]],
            ORG_TELEFONE: [''],
            ORG_INSTAGRAM: ['', [instagramValido]],
            ORG_NOTAS: ['', [Validators.maxLength(2000)]],
        });
    }

    salvar(): void {
        if (this.salvando) {
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this._snackBar.open('Verifique os campos destacados em vermelho antes de salvar.', 'X', { duration: 5000 });
            return;
        }
        const v = this.form.getRawValue();
        const body: Organizador = {
            ORG_NOME: (v.ORG_NOME ?? '').trim(),
            ORG_CONTATO: (v.ORG_CONTATO ?? '').trim() || null,
            ORG_EMAIL: normalizarEmail(v.ORG_EMAIL) || null,
            ORG_TELEFONE: somenteDigitos(v.ORG_TELEFONE) || null,
            ORG_INSTAGRAM: limparInstagram(v.ORG_INSTAGRAM) || null,
            ORG_NOTAS: (v.ORG_NOTAS ?? '').trim() || null,
        };
        this.salvando = true;
        this._service.Add(body).subscribe({
            next: criado => {
                this.salvando = false;
                this._snackBar.open('Organizador salvo com sucesso.', 'X', { duration: 4000 });
                this._service.NotificarAlteracao();
                this._dialogRef.close(criado);
            },
            error: error => {
                this.salvando = false;
                this._snackBar.open(mensagemErro(error, 'Não foi possível salvar o organizador.'), 'X', { duration: 6000 });
            },
        });
    }

    fechar(): void {
        this._dialogRef.close();
    }

    erro(nome: string): string {
        const e = this.form.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['email']) { return 'E-mail inválido.'; }
        if (e['instagram']) { return 'Use só letras, números, ponto e sublinhado.'; }
        if (e['mask']) { return 'Telefone incompleto (DDD + número).'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return 'Valor inválido.';
    }
}
