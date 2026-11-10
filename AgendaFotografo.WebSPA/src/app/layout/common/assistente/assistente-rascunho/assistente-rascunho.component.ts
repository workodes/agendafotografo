import { NgFor, NgIf } from '@angular/common';
import { Component, DoCheck, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, concatMap, from, map, of, switchMap, takeUntil, toArray } from 'rxjs';
import { ChatRascunhoMembro } from 'app/models/DTOs/responses/ChatRascunhoMembro';
import { EventoResumo } from 'app/models/DTOs/responses/EventoResumo';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { ChatMensagem } from 'app/models/entities/ChatMensagem';
import { Evento } from 'app/models/entities/Evento';
import { FUNCAO_MEMBRO_ROTULO } from 'app/models/enums/FuncaoMembro';
import { STATUS_EVENTO, StatusEvento } from 'app/models/enums/StatusEvento';
import { ChatService } from 'app/services/chat.service';
import { EventoService } from 'app/services/evento.service';
import { formatarDataIso, horaDaApi, horaParaApi, parseDataIso } from 'app/utils/data-evento';
import { textoOutrosEventos } from 'app/utils/escala';
import { linhaEventoResumo } from 'app/utils/evento-resumo';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { abrirRota } from 'app/utils/navegar';
import { normalizarUrl, urlHttp } from 'app/utils/url-evento';

// Card do rascunho de evento montado pelo assistente (a IA nunca grava). Os campos são editáveis; cada mudança
// volta para a mensagem e para o sessionStorage, e o rascunho vai no estado atual no próximo envio.
// Confirmar = Evento/Criar (que já gera o checklist) e, em sequência, Evento/AdicionarMembro de cada membro.
@Component({
    selector: 'app-assistente-rascunho',
    templateUrl: './assistente-rascunho.component.html',
    standalone: true,
    imports: [
        NgFor, NgIf, ReactiveFormsModule,
        MatButtonModule, MatCheckboxModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule,
        MatProgressSpinnerModule, MatSelectModule,
    ],
})
export class AssistenteRascunhoComponent implements OnInit, DoCheck, OnDestroy {
    /** Mensagem do assistente que carrega o Rascunho (e, depois de confirmar, o Lancamento). Editada no lugar. */
    @Input({ required: true }) mensagem!: ChatMensagem;
    /** Pede ao painel que feche (depois de navegar para a ficha ou para o formulário). */
    @Output() readonly fechar = new EventEmitter<void>();

    readonly dataMin = new Date(2000, 0, 1);
    readonly dataMax = new Date(2100, 11, 31);
    readonly statusLista = STATUS_EVENTO;
    readonly funcaoRotulo = FUNCAO_MEMBRO_ROTULO;

    form!: FormGroup;
    tipos: Opcao[] = [];
    organizadores: Opcao[] = [];
    confirmando = false;
    erro = '';
    readonly linhaResumo = linhaEventoResumo;
    private _contandoConfirmacao = false;
    private _ultimoDesabilitado = false;
    private _destroy$ = new Subject<void>();

    constructor(
        private _fb: FormBuilder,
        private _chat: ChatService,
        private _eventoService: EventoService,
        private _router: Router,
        private _route: ActivatedRoute,
    ) { }

    get membros(): ChatRascunhoMembro[] {
        return this.mensagem.Rascunho?.Membros ?? [];
    }

    get semelhantes(): EventoResumo[] {
        return this.mensagem.Rascunho?.Semelhantes ?? [];
    }

    /** Avisos da IA; o "Já existe ..." some quando o alerta de semelhantes já mostra o mesmo (com os links). */
    get avisos(): string[] {
        const todos = this.mensagem.Rascunho?.Avisos ?? [];
        return this.semelhantes.length ? todos.filter(a => !a.startsWith('Já existe')) : todos;
    }

    /** Há uma resposta mais nova com outro rascunho: este card fica só para consulta. */
    get substituido(): boolean {
        return !this.lancado && !this._chat.RascunhoVigente(this.mensagem);
    }

    get lancado(): boolean {
        return !!this.mensagem.Lancamento;
    }

    get desabilitado(): boolean {
        return this.lancado || this.confirmando || this.substituido;
    }

    ngOnInit(): void {
        const e = this.mensagem.Rascunho?.Evento;
        this.tipos = e?.EVE_TIPO_EVENTO_ID ? [{ Id: e.EVE_TIPO_EVENTO_ID, Nome: e.TipoEventoNome ?? '' }] : [];
        this.organizadores = e?.EVE_ORGANIZADOR_ID ? [{ Id: e.EVE_ORGANIZADOR_ID, Nome: e.OrganizadorNome ?? '' }] : [];

        this.form = this._fb.group({
            nome: [e?.EVE_NOME ?? '', [Validators.required, Validators.maxLength(200)]],
            tipoId: [e?.EVE_TIPO_EVENTO_ID ?? null as string | null, [Validators.required]],
            data: [parseDataIso(e?.EVE_DATA), [Validators.required]],
            hora: [horaDaApi(e?.EVE_HORA)],
            aConfirmar: [!e?.EVE_HORA],
            cidade: [e?.EVE_CIDADE ?? '', [Validators.required, Validators.maxLength(100)]],
            local: [e?.EVE_LOCAL ?? '', [Validators.maxLength(200)]],
            linkInscricao: [e?.EVE_LINK_INSCRICAO ?? '', [urlHttp]],
            organizadorId: [e?.EVE_ORGANIZADOR_ID ?? null as string | null],
            status: [e?.EVE_STATUS ?? StatusEvento.Pendente],
        });
        this._ultimoDesabilitado = this.desabilitado;
        this.aplicarEstado();

        this.form.valueChanges.pipe(takeUntil(this._destroy$)).subscribe(() => this.sincronizar());
        this.form.get('aConfirmar')!.valueChanges.pipe(takeUntil(this._destroy$)).subscribe(aConfirmar => {
            if (aConfirmar) {
                this.form.get('hora')!.setValue('', { emitEvent: false });
            }
            this.aplicarEstado();
            this.sincronizar();
        });

        // Combos completos (ativos do assinante); o que a IA escolheu continua selecionado mesmo se não vier na lista.
        this._chat.Opcoes().pipe(takeUntil(this._destroy$)).subscribe({
            next: o => {
                this.tipos = this.mesclar(o.tipos, this.tipos);
                this.organizadores = this.mesclar(o.organizadores, this.organizadores);
            },
            error: () => { /* mantém só a opção escolhida pela IA */ },
        });
    }

    /** O card pode virar "Substituído" depois de criado (chegou outra resposta com rascunho): reaplica o estado dos campos. */
    ngDoCheck(): void {
        if (this.form && this.desabilitado !== this._ultimoDesabilitado) {
            this._ultimoDesabilitado = this.desabilitado;
            this.aplicarEstado();
        }
    }

    ngOnDestroy(): void {
        this.encerrarConfirmacao();
        this._destroy$.next();
        this._destroy$.complete();
    }

    /** Ao sair do campo, completa o https:// do link. */
    normalizarLink(): void {
        const c = this.form.get('linkInscricao')!;
        const v = normalizarUrl(c.value);
        if (v !== c.value) {
            c.setValue(v);
        }
    }

    abrirSemelhante(s: EventoResumo, event: MouseEvent): void {
        abrirRota(this._router, this._route, ['/assinante/eventos', s.Id], event);
        if (event.type === 'click' && !event.ctrlKey && !event.metaKey) {
            this.fechar.emit();
        }
    }

    private encerrarConfirmacao(): void {
        if (this._contandoConfirmacao) {
            this._contandoConfirmacao = false;
            this._chat.EncerrarConfirmacao();
        }
    }

    campoInvalido(campo: string): boolean {
        const c = this.form.get(campo);
        return !!c && c.invalid && (c.touched || c.dirty);
    }

    /** Textos de conflito do membro ("Também em: ..."); vazio quando não há outro evento no dia. */
    conflito(m: ChatRascunhoMembro): string {
        return textoOutrosEventos(m.OutrosEventos);
    }

    posicao(m: ChatRascunhoMembro, valor: string): void {
        m.EVM_POSICAO = valor.trim() ? valor : null;
        this._chat.Persistir();
    }

    removerMembro(m: ChatRascunhoMembro): void {
        if (!this.mensagem.Rascunho || this.desabilitado) {
            return;
        }
        this.mensagem.Rascunho.Membros = this.mensagem.Rascunho.Membros.filter(x => x !== m);
        this._chat.Persistir();
    }

    trackMembro(_: number, m: ChatRascunhoMembro): string {
        return m.EVM_MEMBRO_ID;
    }

    // ---- Ações ----

    confirmar(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.desabilitado || !this.mensagem.Rascunho) {
            return;
        }
        this.sincronizar();
        const membros = [...this.mensagem.Rascunho.Membros];
        const evento = this.montarEvento();

        this.erro = '';
        this.confirmando = true;
        this._contandoConfirmacao = true;
        this._chat.IniciarConfirmacao();
        this.aplicarEstado();

        this._eventoService.Add(evento).pipe(
            switchMap(criado => {
                // O evento já existe: guarda o Id antes de escalar, para o card nunca criar duas vezes (nem depois de F5).
                this.mensagem.Lancamento = { EventoId: criado.Id!, NaoEscalados: [] };
                this._chat.Persistir();
                return from(membros).pipe(
                    concatMap(m => this._eventoService.AdicionarMembro({
                        EVM_EVENTO_ID: criado.Id!,
                        EVM_MEMBRO_ID: m.EVM_MEMBRO_ID,
                        EVM_POSICAO: m.EVM_POSICAO?.trim() ? m.EVM_POSICAO.trim() : null,
                    }).pipe(map(() => null as string | null), catchError(() => of(m.MEM_NOME)))),
                    toArray(),
                );
            }),
            takeUntil(this._destroy$),
        ).subscribe({
            next: resultados => {
                this.mensagem.Lancamento!.NaoEscalados = resultados.filter((n): n is string => !!n);
                this.confirmando = false;
                this.encerrarConfirmacao();
                this.aplicarEstado();
                this._chat.Persistir();
                this._eventoService.NotificarAlteracao();
            },
            error: error => {
                // Falha no Criar (nada foi gravado): mostra o erro e deixa o card editável.
                this.confirmando = false;
                this.encerrarConfirmacao();
                this.erro = mensagemErro(error, 'Não foi possível criar o evento. Tente novamente.');
                this.aplicarEstado();
            },
        });
    }

    abrirFicha(event: MouseEvent): void {
        const id = this.mensagem.Lancamento?.EventoId;
        if (!id) {
            return;
        }
        abrirRota(this._router, this._route, ['/assinante/eventos', id], event);
        if (event.type === 'click' && !event.ctrlKey && !event.metaKey) {
            this.fechar.emit();
        }
    }

    abrirFormulario(): void {
        if (!this.mensagem.Rascunho || this.desabilitado) {
            return;
        }
        this.sincronizar();
        const { Evento, Membros } = this.mensagem.Rascunho;
        // O rascunho vai só no estado da navegação (nunca na URL). A escala é manual: a ficha apenas avisa quem escalar.
        this._router.navigate(['/assinante/eventos/novo'], { state: { rascunhoAssistente: { Evento, Membros } }, onSameUrlNavigation: 'reload' });
        this.fechar.emit();
    }

    // ---- Privados ----

    private mesclar(lista: Opcao[], escolhidas: Opcao[]): Opcao[] {
        const extras = escolhidas.filter(e => !lista.some(o => o.Id === e.Id));
        return [...extras, ...lista];
    }

    /** Hora desabilitada com "A confirmar"; o card inteiro fica desabilitado enquanto confirma e depois de lançado. */
    private aplicarEstado(): void {
        if (this.desabilitado) {
            this.form.disable({ emitEvent: false });
            return;
        }
        this.form.enable({ emitEvent: false });
        if (this.form.get('aConfirmar')!.value) {
            this.form.get('hora')!.disable({ emitEvent: false });
        }
    }

    /** Devolve os valores do formulário ao rascunho da mensagem e regrava a conversa. */
    private sincronizar(): void {
        const r = this.mensagem.Rascunho;
        if (!r) {
            return;
        }
        const v = this.form.getRawValue();
        const e = r.Evento;
        e.EVE_NOME = (v.nome ?? '').trim();
        e.EVE_TIPO_EVENTO_ID = v.tipoId ?? '';
        e.TipoEventoNome = this.tipos.find(t => t.Id === v.tipoId)?.Nome ?? e.TipoEventoNome;
        // Data apagada/incompleta não é gravada: fica a última válida (a API não aceita data vazia).
        if (v.data instanceof Date && !isNaN(v.data.getTime())) {
            e.EVE_DATA = formatarDataIso(v.data);
        }
        e.EVE_HORA = v.aConfirmar ? null : horaParaApi(v.hora);
        e.EVE_CIDADE = (v.cidade ?? '').trim();
        e.EVE_LOCAL = (v.local ?? '').trim() || null;
        e.EVE_LINK_INSCRICAO = normalizarUrl(v.linkInscricao) || null;
        e.EVE_ORGANIZADOR_ID = v.organizadorId || null;
        e.OrganizadorNome = v.organizadorId ? (this.organizadores.find(o => o.Id === v.organizadorId)?.Nome ?? e.OrganizadorNome) : null;
        e.EVE_STATUS = v.status;
        this._chat.Persistir();
    }

    /** Corpo do Evento/Criar: o EventoModel sem Id e sem os campos que só existem na saída. */
    private montarEvento(): Evento {
        const e = this.mensagem.Rascunho!.Evento;
        const corpo: Evento = {
            EVE_NOME: e.EVE_NOME,
            EVE_TIPO_EVENTO_ID: e.EVE_TIPO_EVENTO_ID,
            EVE_DATA: e.EVE_DATA,
            EVE_HORA: e.EVE_HORA ?? null,
            EVE_CIDADE: e.EVE_CIDADE,
            EVE_LOCAL: e.EVE_LOCAL ?? null,
            EVE_LINK_INSCRICAO: e.EVE_LINK_INSCRICAO ?? null,
            EVE_STATUS: e.EVE_STATUS,
            EVE_ORGANIZADOR_ID: e.EVE_ORGANIZADOR_ID ?? null,
            EVE_INFORMACOES: e.EVE_INFORMACOES ?? null,
        };
        return corpo;
    }
}
