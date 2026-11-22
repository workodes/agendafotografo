import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Subject, filter, takeUntil } from 'rxjs';
import { EventoPessoal } from 'app/models/entities/EventoPessoal';
import { STATUS_EVENTO, STATUS_EVENTO_COR, STATUS_EVENTO_ROTULO, StatusEvento } from 'app/models/enums/StatusEvento';
import { EventoPessoalService } from 'app/services/evento-pessoal.service';
import { diaSemana, formatarDataIso, horaDaApi, horaParaApi, parseDataIso } from 'app/utils/data-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { normalizarUrl, urlHttp } from 'app/utils/url-evento';

const ROTA_EVENTOS = '/fotografo/eventos';
const ROTA_AGENDA = '/fotografo/agenda';

/**
 * Ficha do evento pessoal do Fotógrafo (plano 20), página inteira em `/fotografo/eventos/novo` e `/:id`.
 * Datas "yyyy-MM-dd" sem fuso; hora "HH:mm:ss" ou null ("A confirmar").
 */
@Component({
    selector: 'evento-pessoal-details',
    templateUrl: './evento-pessoal-details.component.html',
    standalone: true,
    host: { class: 'flex flex-col flex-auto w-full min-w-0 min-h-0' },
    imports: [
        CommonModule, ReactiveFormsModule,
        MatButtonModule, MatCheckboxModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule,
        MatProgressSpinnerModule, MatSelectModule,
    ],
})
export class EventoPessoalDetailsComponent implements OnInit, OnDestroy {
    form: FormGroup;
    evento: EventoPessoal | null = null;
    salvando = false;
    excluindo = false;

    readonly dataMin = new Date(2000, 0, 1);
    readonly dataMax = new Date(2100, 11, 31);
    readonly statusLista = STATUS_EVENTO;
    readonly statusCor = STATUS_EVENTO_COR;
    readonly statusRotulo = STATUS_EVENTO_ROTULO;
    private _destroy$ = new Subject<void>();

    constructor(
        private _fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: EventoPessoalService,
        private _snackBar: MatSnackBar,
        private _confirmacao: FuseConfirmationService,
        private _title: Title,
    ) { }

    get ehNovo(): boolean {
        return !this.evento?.Id;
    }

    get diaDaSemana(): string {
        const d = this.form?.get('EPS_DATA')?.value;
        return d instanceof Date && !isNaN(d.getTime()) ? diaSemana(formatarDataIso(d)) : '';
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            EPS_NOME: ['', [Validators.required, Validators.maxLength(200)]],
            EPS_DATA: [null as Date | null, [Validators.required]],
            EPS_HORA: [{ value: '', disabled: true }],
            EPS_HORA_A_CONFIRMAR: [true],
            EPS_CIDADE: ['', [Validators.required, Validators.maxLength(100)]],
            EPS_LOCAL: ['', [Validators.maxLength(300)]],
            EPS_STATUS: [StatusEvento.Confirmado, [Validators.required]],
            EPS_LINK: ['', [urlHttp]],
            EPS_OBSERVACOES: ['', [Validators.maxLength(2000)]],
        });
        this.form.get('EPS_HORA_A_CONFIRMAR')!.valueChanges.pipe(takeUntil(this._destroy$)).subscribe(a => this.aplicarAConfirmar(!!a));

        // Reage a mudanças de rota (novo -> :id etc.) reaproveitando o componente.
        this._route.data.pipe(takeUntil(this._destroy$)).subscribe(data => {
            this.evento = data['data']?.evento ?? null;
            this.preencher();
            this._title.setTitle(this.evento ? `Evento: ${this.evento.EPS_NOME}` : 'Novo evento');
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    private preencher(): void {
        const e = this.evento;
        let data: Date | null = e ? parseDataIso(e.EPS_DATA) : null;
        if (!e) {
            // novo?data=yyyy-MM-dd pré-preenche a data
            data = parseDataIso(this._route.snapshot.queryParamMap.get('data'));
        }
        this.form.reset({
            EPS_NOME: e?.EPS_NOME ?? '',
            EPS_DATA: data,
            EPS_HORA: horaDaApi(e?.EPS_HORA),
            EPS_HORA_A_CONFIRMAR: !e?.EPS_HORA,
            EPS_CIDADE: e?.EPS_CIDADE ?? '',
            EPS_LOCAL: e?.EPS_LOCAL ?? '',
            EPS_STATUS: e?.EPS_STATUS ?? StatusEvento.Confirmado,
            EPS_LINK: e?.EPS_LINK ?? '',
            EPS_OBSERVACOES: e?.EPS_OBSERVACOES ?? '',
        });
        this.aplicarAConfirmar(!e?.EPS_HORA);
    }

    private aplicarAConfirmar(aConfirmar: boolean): void {
        const hora = this.form.get('EPS_HORA')!;
        if (aConfirmar) {
            hora.setValue('', { emitEvent: false });
            hora.disable({ emitEvent: false });
        } else {
            hora.enable({ emitEvent: false });
        }
    }

    completarLink(): void {
        const c = this.form.get('EPS_LINK')!;
        const n = normalizarUrl(c.value);
        if (n && n !== c.value) {
            c.setValue(n);
        }
    }

    salvar(): void {
        if (this.salvando || this.excluindo) {
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this._snackBar.open('Verifique os campos destacados em vermelho antes de salvar.', 'X', { duration: 5000 });
            return;
        }

        const v = this.form.getRawValue();
        const body: EventoPessoal = {
            Id: this.evento?.Id,
            EPS_NOME: (v.EPS_NOME ?? '').trim(),
            EPS_DATA: formatarDataIso(v.EPS_DATA),
            // Sempre com segundos ("HH:mm:ss"); "a confirmar" vai como null.
            EPS_HORA: v.EPS_HORA_A_CONFIRMAR ? null : horaParaApi(v.EPS_HORA),
            EPS_CIDADE: (v.EPS_CIDADE ?? '').trim(),
            EPS_LOCAL: (v.EPS_LOCAL ?? '').trim() || null,
            EPS_STATUS: v.EPS_STATUS,
            EPS_LINK: normalizarUrl(v.EPS_LINK) || null,
            EPS_OBSERVACOES: (v.EPS_OBSERVACOES ?? '').trim() || null,
        };

        this.salvando = true;
        if (body.Id) {
            this._service.Update(body).subscribe({
                next: salvo => {
                    this.salvando = false;
                    this.evento = salvo;
                    this.preencher();
                    this._title.setTitle(`Evento: ${salvo.EPS_NOME}`);
                    this._service.NotificarAlteracao();
                    this._snackBar.open('Evento salvo com sucesso.', 'X', { duration: 4000 });
                },
                error: error => this.falhaAoSalvar(error),
            });
            return;
        }

        delete body.Id;
        this._service.Add(body).subscribe({
            next: criado => {
                this.salvando = false;
                this._service.NotificarAlteracao();
                this._snackBar.open('Evento criado.', 'X', { duration: 4000 });
                // Como a ficha do evento do assinante: depois de criar, abre a edição (:id).
                this._router.navigate([ROTA_EVENTOS, criado.Id], { replaceUrl: true });
            },
            error: error => this.falhaAoSalvar(error),
        });
    }

    excluir(): void {
        if (this.excluindo || !this.evento?.Id) {
            return;
        }
        const id = this.evento.Id;
        this._confirmacao.open({
            title: 'Excluir evento',
            message: `Excluir o evento "${this.evento.EPS_NOME}"? Não dá para desfazer. Se a prova não vai acontecer, prefira mudar o status para Cancelado.`,
            icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
            actions: { cancel: { label: 'Cancelar' }, confirm: { label: 'Excluir', color: 'warn' } },
            dismissible: true,
        }).afterClosed().pipe(filter(r => r === 'confirmed')).subscribe(() => {
            this.excluindo = true;
            this._service.Delete(id).subscribe({
                next: () => {
                    this.excluindo = false;
                    this._service.NotificarAlteracao();
                    this._snackBar.open('Evento excluído.', 'X', { duration: 4000 });
                    this.voltar();
                },
                error: error => {
                    this.excluindo = false;
                    this._snackBar.open(mensagemErro(error, 'Não foi possível excluir o evento.'), 'X', { duration: 6000 });
                },
            });
        });
    }

    // Volta à Agenda no mês e dia do evento (a data gravada); em `novo`, o ?data= ou o mês atual.
    voltar(): void {
        const gravada = this.evento?.EPS_DATA;
        let dia: string | null = null;
        if (parseDataIso(gravada)) {
            dia = gravada!.substring(0, 10);
        } else if (!this.evento?.Id) {
            const q = this._route.snapshot.queryParamMap.get('data');
            dia = parseDataIso(q) ? q!.substring(0, 10) : null;
        }
        const queryParams: Record<string, string> = {};
        if (dia) {
            queryParams['mes'] = dia.substring(0, 7);
            queryParams['dia'] = dia;
        }
        this._router.navigate([ROTA_AGENDA], { queryParams });
    }

    erro(nome: string): string {
        const e = this.form.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['matDatepickerParse']) { return 'Data inválida.'; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['matDatepickerMin'] || e['matDatepickerMax']) { return 'Use uma data entre 2000 e 2100.'; }
        if (e['url']) { return 'Link inválido. Use um endereço http ou https.'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return 'Valor inválido.';
    }

    private falhaAoSalvar(error: any): void {
        this.salvando = false;
        this._snackBar.open(mensagemErro(error, 'Não foi possível salvar o evento.'), 'X', { duration: 7000 });
    }
}
