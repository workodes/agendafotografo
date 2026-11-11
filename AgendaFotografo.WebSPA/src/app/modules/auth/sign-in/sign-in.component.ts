import { NgIf } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule, NgForm, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';
import { QcAuthShellComponent } from 'app/shared/auth-shell/qc-auth-shell.component';

@Component({
    selector: 'auth-sign-in',
    templateUrl: './sign-in.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    standalone: true,
    imports: [
        QcAuthShellComponent,
        NgIf,
        FormsModule,
        ReactiveFormsModule,
        MatIconModule,
        MatProgressSpinnerModule,
    ],
})
export class AuthSignInComponent implements OnInit {
    @ViewChild('signInNgForm') signInNgForm: NgForm;

    alert: { type: FuseAlertType; message: string } = { type: 'success', message: '' };
    signInForm: UntypedFormGroup;
    showAlert: boolean = false;

    constructor(
        private authService: AuthService,
        private formBuilder: UntypedFormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private _title: Title,
    ) { }

    ngOnInit(): void {
        // Título da aba do login no padrão "Página | Marca" (o mesmo do index.html); as demais telas definem o próprio título
        this._title.setTitle('Agenda Fotógrafos | QuemClica');

        const rememberedEmail = this.authService.rememberedEmail;

        this.signInForm = this.formBuilder.group({
            email: [rememberedEmail, [Validators.required, Validators.email]],
            password: ['', Validators.required],
            rememberMe: [!!rememberedEmail],
        });
    }

    signIn(): void {
        if (this.signInForm.invalid)
            return;

        this.signInForm.disable();
        this.showAlert = false;

        this.authService.signIn(this.signInForm.value).subscribe({
            next: () => {
                const redirectURL = this.route.snapshot.queryParamMap.get('redirectURL');
                this.router.navigateByUrl(redirectURL || this.authService.getRotaInicial());
            },
            error: error => {
                this.signInForm.enable();
                this.alert = { type: 'error', message: error.error ?? 'Erro ao fazer login' };
                this.showAlert = true;
            },
        });
    }
}
