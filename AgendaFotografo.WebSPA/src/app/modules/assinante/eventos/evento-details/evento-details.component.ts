import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Subject, filter, takeUntil } from 'rxjs';
import { EventoArquivoItem } from 'app/models/DTOs/responses/EventoArquivoItem';
import { EventoMembroItem } from 'app/models/DTOs/responses/EventoMembroItem';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { Organizador } from 'app/models/entities/Organizador';
import { Evento } from 'app/models/entities/Evento';
import { FUNCAO_MEMBRO_ROTULO } from 'app/models/enums/FuncaoMembro';
import { STATUS_EVENTO, STATUS_EVENTO_COR, STATUS_EVENTO_ROTULO, StatusEvento } from 'app/models/enums/StatusEvento';
import { TipoArquivoEvento } from 'app/models/enums/TipoArquivoEvento';
import { CATEGORIA_PENDENCIA_ROTULO } from 'app/models/enums/CategoriaPendencia';
import { PRIORIDADE_PENDENCIA_COR, PRIORIDADE_PENDENCIA_ROTULO } from 'app/models/enums/PrioridadePendencia';
import { StatusPendencia } from 'app/models/enums/StatusPendencia';
import { OrganizadorService } from 'app/services/organizador.service';
import { CustomSearchSelectComponent } from 'app/modules/shared/components/custom-select/custom-select.component';
import { OpcoesSelect } from 'app/utils/opcoes-select';
import { OrganizadorDialogComponent } from '../../organizadores/organizador-dialog/organizador-dialog.component';
import { EventoService } from 'app/services/evento.service';
import { diaSemana, formatarDataComDiaSemana, formatarDataIso, formatarHora, horaDaApi, horaParaApi, parseDataIso } from 'app/utils/data-evento';
import { textoOutrosEventos } from 'app/utils/escala';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { contarPendencias, formatarPrazo } from 'app/utils/pendencia';
import { EventoLinkItem } from 'app/models/DTOs/responses/EventoLinkItem';
import { ProgressoPendenciasComponent } from 'app/modules/shared/components/progresso-pendencias/progresso-pendencias.component';
import { CampoLocalComponent } from 'app/modules/shared/components/campo-local/campo-local.component';
import { LocalSugestao } from 'app/models/DTOs/responses/LocalSugestao';
import { normalizarUrl, urlHttp } from 'app/utils/url-evento';
import { EscalarMembroDialogComponent, EscalarMembroDialogData } from '../escalar-membro-dialog/escalar-membro-dialog.component';
import { EventoArquivoComponent } from '../evento-arquivo/evento-arquivo.component';
import { EventoLinkPublicoComponent } from '../evento-link-publico/evento-link-publico.component';
import { PENDENCIA_DIALOG_CONFIG, PendenciaDialogComponent, PendenciaDialogData, PendenciaDialogResultado } from '../../pendencias/pendencia-dialog/pendencia-dialog.component';
import { PendenciaStatusChipComponent } from '../../pendencias/pendencia-status-chip/pendencia-status-chip.component';

const ROTA_EVENTOS = '/assinante/eventos';
const ROTA_AGENDA = '/assinante/agenda';

// Campos de texto/link opcionais: o que estiver vazio vai como null.
const CAMPOS_TEXTO = [
    'EVE_LARGADA_LOCAL', 'EVE_CHEGADA_LOCAL', 'EVE_INFORMACOES', 'EVE_OBSERVACOES_EQUIPE', 'EVE_NOTAS_INTERNAS',
] as const;
const CAMPOS_LINK = [
    'EVE_LARGADA_LINK', 'EVE_CHEGADA_LINK', 'EVE_LINK_INSCRICAO', 'EVE_LINK_FOTOS', 'EVE_ROTA_LINK_MAPS', 'EVE_ROTA_LINK_STRAVA',
] as const;

// Seções da ficha, na ordem da página (a navegação lateral rola até o `id` e destaca a visível).
interface SecaoFicha {
    id: string;
    rotulo: string;
    subtitulo: string;
    // Seções que ficam bloqueadas em `novo` (mostram cadeado no lugar do selo).
    bloqueadaNoNovo?: boolean;
}

const SECOES_FICHA: SecaoFicha[] = [
    { id: 'sec-dados', rotulo: 'Dados do evento', subtitulo: 'Nome, data, hora e links' },
    { id: 'sec-local', rotulo: 'Local e rota', subtitulo: 'Largada, chegada e percurso' },
    { id: 'sec-equipe', rotulo: 'Equipe', subtitulo: 'Quem vai cobrir', bloqueadaNoNovo: true },
    { id: 'sec-pendencias', rotulo: 'Pendências', subtitulo: 'O que falta fazer', bloqueadaNoNovo: true },
    { id: 'sec-observacoes', rotulo: 'Observações', subtitulo: 'Para a equipe e internas' },
    { id: 'sec-link', rotulo: 'Link público', subtitulo: 'Página para a equipe', bloqueadaNoNovo: true },
];

// Ficha do evento em página inteira (cabeçalho fixo com Excluir/Fechar/Salvar): Dados, Local e rota, Equipe, Pendências, Observações e Link público.
// Em `novo` a Equipe e os uploads ficam desabilitados até o primeiro salvamento (depois navega para :id).
@Component({
    standalone: true,
    selector: 'evento-details',
    templateUrl: './evento-details.component.html',
    host: { class: 'flex flex-col flex-auto w-full min-w-0 min-h-0' },
    imports: [
        CommonModule, RouterModule, ReactiveFormsModule,
        MatButtonModule, MatCheckboxModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule,
        MatProgressSpinnerModule, MatSelectModule, CustomSearchSelectComponent,
        EventoArquivoComponent, EventoLinkPublicoComponent, PendenciaStatusChipComponent, ProgressoPendenciasComponent,
        CampoLocalComponent,
    ],
})
export class EventoDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('rolagem') rolagem?: ElementRef<HTMLElement>;
    readonly secoes = SECOES_FICHA;
    secaoAtual = SECOES_FICHA[0].id;
    // Selo do Link público: vem do `linkChange` da seção (nulo = ainda não carregou).
    linkItem: EventoLinkItem | null = null;
    private _observador?: IntersectionObserver;
    form: FormGroup;
    // Preenchido na edição (vem do resolver e é atualizado ao salvar).
    evento?: Evento | null;
    equipe: EventoMembroItem[] = [];
    // Pendências da ficha. A atribuição separa as que estão em jogo (abertas e concluídas, na ordem da API) das ignoradas.
    private _pendencias: EventoPendenciaItem[] = [];
    pendenciasVisiveis: EventoPendenciaItem[] = [];
    pendenciasIgnoradas: EventoPendenciaItem[] = [];
    get pendencias(): EventoPendenciaItem[] { return this._pendencias; }
    set pendencias(lista: EventoPendenciaItem[]) {
        this._pendencias = lista ?? [];
        this.pendenciasVisiveis = this._pendencias.filter(p => p.EVP_STATUS !== StatusPendencia.Ignorada);
        this.pendenciasIgnoradas = this._pendencias.filter(p => p.EVP_STATUS === StatusPendencia.Ignorada);
    }
    ignoradasExpandidas = false;
    aplicandoChecklist = false;
    // Ids com Ignorar/Restaurar em andamento (evita clique duplo).
    private _alterandoStatus = new Set<string>();
    arquivos: EventoArquivoItem[] = [];
    tipos: Opcao[] = [];
    organizadores: Opcao[] = [];

    private _tiposSel = new OpcoesSelect<Opcao>(t => t.Id, t => t.Nome);
    private _orgsSel = new OpcoesSelect<Opcao>(o => o.Id, o => o.Nome);
    get tiposOpcoes() { return this._tiposSel.de(this.tipos); }
    get organizadoresOpcoes() { return this._orgsSel.de(this.organizadores); }

    statusLista = STATUS_EVENTO;
    statusRotulo = STATUS_EVENTO_ROTULO;
    statusCor = STATUS_EVENTO_COR;
    funcaoRotulo = FUNCAO_MEMBRO_ROTULO;
    tipoArquivo = TipoArquivoEvento;
    textoOutrosEventos = textoOutrosEventos;
    categoriaPendenciaRotulo = CATEGORIA_PENDENCIA_ROTULO;
    prioridadePendenciaRotulo = PRIORIDADE_PENDENCIA_ROTULO;
    prioridadePendenciaCor = PRIORIDADE_PENDENCIA_COR;
    concluida = StatusPendencia.Concluida;
    ignorada = StatusPendencia.Ignorada;
    formatarPrazo = formatarPrazo;

    readonly dataMin = new Date(2000, 0, 1);
    readonly dataMax = new Date(2100, 11, 31);

    linksDados = [
        { campo: 'EVE_LINK_INSCRICAO', rotulo: 'Link de inscrição' },
        { campo: 'EVE_LINK_FOTOS', rotulo: 'Link das fotos' },
    ];
    pontos = [
        { local: 'EVE_LARGADA_LOCAL', link: 'EVE_LARGADA_LINK', rotulo: 'Largada' },
        { local: 'EVE_CHEGADA_LOCAL', link: 'EVE_CHEGADA_LINK', rotulo: 'Chegada' },
    ];
    linksRota = [
        { campo: 'EVE_ROTA_LINK_MAPS', rotulo: 'Rota no Google Maps ou My Maps' },
        { campo: 'EVE_ROTA_LINK_STRAVA', rotulo: 'Rota no Strava' },
    ];

    salvando = false;
    excluindo = false;
    ocupadoEscala = false;
    private _destroy$ = new Subject<void>();

    constructor(
        private _fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: EventoService,
        private _confirmacao: FuseConfirmationService,
        private _snackBar: MatSnackBar,
        private _dialog: MatDialog,
        private _organizadorService: OrganizadorService,
        private _title: Title,
    ) { }

    get ehNovo(): boolean {
        return !this.evento?.Id;
    }

    // Abertas = A fazer e Em andamento; total não conta Ignoradas (mesma regra da API; ver utils/pendencia.ts).
    get contagem() { return contarPendencias(this.pendencias); }

    get pendenciasAbertas(): number {
        return this.contagem.abertas;
    }

    get cancelado(): boolean {
        return this.evento?.EVE_STATUS === StatusEvento.Cancelado;
    }

    get tipoNome(): string {
        return this.evento?.TipoEventoNome || this.tipos.find(t => t.Id === this.evento?.EVE_TIPO_EVENTO_ID)?.Nome || '';
    }

    get resumoData(): string { return formatarDataComDiaSemana(this.evento?.EVE_DATA); }
    get resumoHora(): string { return formatarHora(this.evento?.EVE_HORA); }

    // Evento cancelado com pendências abertas: elas não aparecem na lista de Pendências nem nos alertas.
    get avisoCancelado(): boolean {
        return this.evento?.EVE_STATUS === StatusEvento.Cancelado && this.pendenciasAbertas > 0;
    }

    get arquivoFlyer(): EventoArquivoItem | null {
        return this.arquivoDoTipo(TipoArquivoEvento.Flyer);
    }

    get arquivoImagemRota(): EventoArquivoItem | null {
        return this.arquivoDoTipo(TipoArquivoEvento.ImagemRota);
    }

    get arquivoGpx(): EventoArquivoItem | null {
        return this.arquivoDoTipo(TipoArquivoEvento.Gpx);
    }

    // Dia da semana da data escolhida, ao lado do campo.
    get diaDaSemana(): string {
        const d = this.form.get('EVE_DATA')?.value as Date | null;
        return d instanceof Date && !isNaN(d.getTime()) ? diaSemana(formatarDataIso(d)) : '';
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            EVE_NOME: ['', [Validators.required, Validators.maxLength(200)]],
            EVE_TIPO_EVENTO_ID: [null as string | null, [Validators.required]],
            EVE_DATA: [null as Date | null, [Validators.required]],
            EVE_HORA: [''],
            EVE_HORA_A_CONFIRMAR: [true],
            EVE_CIDADE: ['', [Validators.required, Validators.maxLength(100)]],
            EVE_LOCAL: ['', [Validators.maxLength(200)]],
            EVE_STATUS: [StatusEvento.Pendente as number, [Validators.required]],
            EVE_ORGANIZADOR_ID: [null as string | null],
            EVE_LARGADA_LOCAL: ['', [Validators.maxLength(300)]],
            EVE_LARGADA_LINK: ['', [urlHttp]],
            EVE_CHEGADA_LOCAL: ['', [Validators.maxLength(300)]],
            EVE_CHEGADA_LINK: ['', [urlHttp]],
            EVE_LINK_INSCRICAO: ['', [urlHttp]],
            EVE_LINK_FOTOS: ['', [urlHttp]],
            EVE_ROTA_LINK_MAPS: ['', [urlHttp]],
            EVE_ROTA_LINK_STRAVA: ['', [urlHttp]],
            EVE_INFORMACOES: ['', [Validators.maxLength(4000)]],
            EVE_OBSERVACOES_EQUIPE: ['', [Validators.maxLength(4000)]],
            EVE_NOTAS_INTERNAS: ['', [Validators.maxLength(4000)]],
        });

        // "A confirmar" limpa e desabilita a hora.
        this.form.get('EVE_HORA_A_CONFIRMAR')!.valueChanges.pipe(takeUntil(this._destroy$)).subscribe(aConfirmar => this.aplicarAConfirmar(!!aConfirmar, true));

        // Reage a mudanças de rota (:id -> outro :id, ou novo -> :id) reaproveitando o componente.
        this._route.data.pipe(takeUntil(this._destroy$)).subscribe(data => {
            const d = data['data'];
            this.tipos = d?.tipos ?? [];
            this.organizadores = d?.organizadores ?? [];
            this.equipe = d?.equipe ?? [];
            this.pendencias = d?.pendencias ?? [];
            this.linkItem = null;
            this.evento = d?.evento ?? null;
            this.arquivos = [...(this.evento?.Arquivos ?? [])];
            this.preencher(this.evento ?? null);
            this._title.setTitle(this.evento ? `Evento: ${this.evento.EVE_NOME}` : 'Novo evento');
        });
    }

    ngAfterViewInit(): void {
        this.observarSecoes();
    }

    // Destaca a seção visível: observa cada seção com a área rolável como raiz (faixa do topo, para valer a que cruza o início da tela).
    private observarSecoes(): void {
        const raiz = this.rolagem?.nativeElement;
        if (!raiz || typeof IntersectionObserver === 'undefined') {
            return;
        }
        const visiveis = new Set<string>();
        this._observador = new IntersectionObserver(entradas => {
            entradas.forEach(e => e.isIntersecting ? visiveis.add(e.target.id) : visiveis.delete(e.target.id));
            const primeira = this.secoes.find(s => visiveis.has(s.id));
            if (primeira && primeira.id !== this.secaoAtual) {
                this.secaoAtual = primeira.id;
            }
        }, { root: raiz, rootMargin: '0px 0px -65% 0px', threshold: 0 });
        this.secoes.forEach(s => {
            const el = raiz.querySelector('#' + s.id);
            if (el) {
                this._observador!.observe(el);
            }
        });
    }

    irParaSecao(id: string): void {
        this.secaoAtual = id;
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    aoMudarLink(link: EventoLinkItem | null): void {
        this.linkItem = link;
    }

    // Texto do selo do Link público.
    get seloLink(): string {
        if (!this.linkItem) {
            return '';
        }
        return !this.linkItem.Configurado ? 'Sem link' : (this.linkItem.EVL_ATIVO ? 'Ativo' : 'Desativado');
    }

    ngOnDestroy(): void {
        this._observador?.disconnect();
        this._destroy$.next();
        this._destroy$.complete();
    }

    // Cadastra um organizador num diálogo, sem sair (nem perder o que foi digitado) do evento.
    novoOrganizador(): void {
        this._dialog.open(OrganizadorDialogComponent, { width: '640px', maxWidth: '95vw', autoFocus: 'first-tabbable' })
            .afterClosed().pipe(filter((o): o is Organizador => !!o?.Id)).subscribe(novo => {
                this._organizadorService.Opcoes(true, novo.Id).subscribe({
                    next: opcoes => {
                        this.organizadores = opcoes;
                        this.form.get('EVE_ORGANIZADOR_ID')!.setValue(novo.Id!);
                    },
                    error: () => {
                        // Falhou o recarregamento: ao menos deixa o novo na lista.
                        this.organizadores = [...this.organizadores, { Id: novo.Id!, Nome: novo.ORG_NOME } as Opcao];
                        this.form.get('EVE_ORGANIZADOR_ID')!.setValue(novo.Id!);
                    },
                });
            });
    }

    // ---- Evento ----

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
        const body: Evento = {
            Id: this.evento?.Id,
            EVE_NOME: (v.EVE_NOME ?? '').trim(),
            EVE_TIPO_EVENTO_ID: v.EVE_TIPO_EVENTO_ID,
            EVE_DATA: formatarDataIso(v.EVE_DATA),
            // Sempre com segundos ("HH:mm:ss"); "a confirmar" vai como null.
            EVE_HORA: v.EVE_HORA_A_CONFIRMAR ? null : horaParaApi(v.EVE_HORA),
            EVE_CIDADE: (v.EVE_CIDADE ?? '').trim(),
            EVE_LOCAL: (v.EVE_LOCAL ?? '').trim() || null,
            EVE_STATUS: v.EVE_STATUS,
            EVE_ORGANIZADOR_ID: v.EVE_ORGANIZADOR_ID || null,
            EVE_LARGADA_LOCAL: null, EVE_LARGADA_LINK: null, EVE_CHEGADA_LOCAL: null, EVE_CHEGADA_LINK: null,
            EVE_LINK_INSCRICAO: null, EVE_LINK_FOTOS: null, EVE_ROTA_LINK_MAPS: null, EVE_ROTA_LINK_STRAVA: null,
            EVE_INFORMACOES: null, EVE_OBSERVACOES_EQUIPE: null, EVE_NOTAS_INTERNAS: null,
        };
        for (const c of CAMPOS_TEXTO) {
            body[c] = (v[c] ?? '').trim() || null;
        }
        for (const c of CAMPOS_LINK) {
            body[c] = normalizarUrl(v[c]) || null; // completa o https:// que faltar
        }

        this.salvando = true;
        if (body.Id) {
            this._service.Update(body).subscribe({
                next: salvo => {
                    this.salvando = false;
                    // Os arquivos são mantidos localmente (envio/remoção já refletidos); a data pode ter mudado: recalcula os alertas.
                    this.evento = { ...salvo, Arquivos: this.arquivos };
                    this.preencher(this.evento);
                    this._title.setTitle(`Evento: ${this.evento.EVE_NOME}`);
                    this.recarregarEquipe();
                    this.recarregarPendencias();
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
                this._snackBar.open('Evento criado. Agora você já pode escalar a equipe e enviar os arquivos.', 'X', { duration: 6000 });
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
            message: `Excluir o evento "${this.evento.EVE_NOME}"? A escala da equipe, as pendências e os arquivos enviados também serão apagados e não dá para desfazer. `
                + 'Se a prova não vai acontecer, prefira mudar o status para Cancelado.',
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

    // Volta para a Agenda no mês (e dia) do evento: a data gravada; em `novo`, o ?data= ou o mês atual.
    voltar(): void {
        const gravada = this.evento?.EVE_DATA;
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

    // ---- Links ----

    // Ao sair do campo, mostra o link já com o https:// completado.
    completarLink(campo: string): void {
        const c = this.form.get(campo)!;
        const n = normalizarUrl(c.value);
        if (n && n !== c.value) {
            c.setValue(n);
        }
    }

    linkAbrivel(campo: string): boolean {
        const c = this.form.get(campo)!;
        return !!normalizarUrl(c.value) && c.valid;
    }

    abrirLink(campo: string): void {
        if (this.linkAbrivel(campo)) {
            window.open(normalizarUrl(this.form.get(campo)!.value), '_blank', 'noopener');
        }
    }

    // ---- Arquivos ----

    arquivoDoTipo(tipo: number): EventoArquivoItem | null {
        return this.arquivos.find(a => a.EVA_TIPO === tipo) ?? null;
    }

    // Envio troca o arquivo do tipo (um por tipo); null remove.
    aoMudarArquivo(tipo: number, item: EventoArquivoItem | null): void {
        this.arquivos = this.arquivos.filter(a => a.EVA_TIPO !== tipo);
        if (item) {
            this.arquivos.push(item);
        }
    }

    // ---- Equipe ----

    escalar(): void {
        if (!this.evento?.Id) {
            return;
        }
        const data: EscalarMembroDialogData = { eventoId: this.evento.Id, dataEvento: this.evento.EVE_DATA };
        this._dialog.open(EscalarMembroDialogComponent, { data, width: '560px', maxWidth: '95vw', autoFocus: 'first-tabbable' })
            .afterClosed().pipe(filter((r): r is EventoMembroItem[] => !!r?.length)).subscribe(itens => {
                this.equipe = [...this.equipe, ...itens];
                this._service.NotificarAlteracao();
                const conflito = itens.filter(i => i.OutrosEventos?.length).map(i => i.MEM_NOME);
                const nomes = itens.length === 1 ? itens[0].MEM_NOME : `${itens.length} membros`;
                if (conflito.length) {
                    this._snackBar.open(`${nomes} escalado(s). Atenção: ${conflito.join(', ')} já está(ão) em outro evento no mesmo dia.`, 'X', { duration: 8000 });
                } else {
                    this._snackBar.open(`${nomes} escalado(s).`, 'X', { duration: 3000 });
                }
            });
    }

    // Grava a posição ao sair do campo (ou Enter) quando mudou.
    salvarPosicao(m: EventoMembroItem, input: HTMLInputElement): void {
        const nova = input.value.trim();
        if (nova === (m.EVM_POSICAO ?? '')) {
            input.value = nova;
            return;
        }
        if (nova.length > 150) {
            this._snackBar.open('A posição pode ter no máximo 150 caracteres.', 'X', { duration: 5000 });
            input.value = m.EVM_POSICAO ?? '';
            return;
        }
        this._service.AtualizarMembro(m.Id, { EVM_POSICAO: nova || null }).subscribe({
            next: item => {
                this.equipe = this.equipe.map(x => (x.Id === item.Id ? item : x));
                this._service.NotificarAlteracao();
            },
            error: error => {
                input.value = m.EVM_POSICAO ?? '';
                this._snackBar.open(mensagemErro(error, 'Não foi possível salvar a posição.'), 'X', { duration: 6000 });
            },
        });
    }

    removerMembro(m: EventoMembroItem): void {
        if (this.ocupadoEscala) {
            return;
        }
        this._confirmacao.open({
            title: 'Remover da escala',
            message: `Remover ${m.MEM_NOME} da escala deste evento?`,
            icon: { show: true, name: 'heroicons_outline:user-minus', color: 'warn' },
            actions: { cancel: { label: 'Cancelar' }, confirm: { label: 'Remover', color: 'warn' } },
            dismissible: true,
        }).afterClosed().pipe(filter(r => r === 'confirmed')).subscribe(() => {
            this.ocupadoEscala = true;
            this._service.RemoverMembro(m.Id).subscribe({
                next: () => {
                    this.ocupadoEscala = false;
                    this.equipe = this.equipe.filter(x => x.Id !== m.Id);
                    this._service.NotificarAlteracao();
                    this._snackBar.open(`${m.MEM_NOME} removido da escala.`, 'X', { duration: 3000 });
                },
                error: error => {
                    this.ocupadoEscala = false;
                    this._snackBar.open(mensagemErro(error, 'Não foi possível remover o membro da escala.'), 'X', { duration: 6000 });
                },
            });
        });
    }

    // ---- Pendências ----

    // Abre o modal (nova ou edição); depois de salvar ou excluir relê a lista (a ordem e os selos vêm da API).
    abrirPendencia(pendencia?: EventoPendenciaItem): void {
        if (!this.evento?.Id) {
            return;
        }
        const data: PendenciaDialogData = {
            eventoId: this.evento.Id,
            eventoNome: this.evento.EVE_NOME,
            eventoData: this.evento.EVE_DATA,
            pendencia: pendencia ?? null,
        };
        this._dialog.open<PendenciaDialogComponent, PendenciaDialogData, PendenciaDialogResultado>(PendenciaDialogComponent, { ...PENDENCIA_DIALOG_CONFIG, data })
            .afterClosed().pipe(filter((r): r is PendenciaDialogResultado => !!r)).subscribe(r => {
                this.recarregarPendencias();
                this._service.NotificarAlteracao(); // atualiza o sino de avisos
                this._snackBar.open(r.acao === 'excluida' ? 'Pendência excluída.' : 'Pendência salva.', 'X', { duration: 3000 });
            });
    }

    recarregarPendencias(): void {
        if (!this.evento?.Id) {
            return;
        }
        this._service.Pendencias(this.evento.Id).subscribe({
            next: lista => (this.pendencias = lista),
            error: () => { /* mantém a lista na tela; os selos ficam desatualizados até recarregar */ },
        });
    }

    // Ignorar (um toque, sem confirmação): o snackbar oferece "Desfazer", que volta ao status anterior.
    ignorarPendencia(p: EventoPendenciaItem, event: Event): void {
        event.stopPropagation();
        const anterior = p.EVP_STATUS;
        this.trocarStatusPendencia(p, StatusPendencia.Ignorada, () => {
            this._snackBar.open('Pendência ignorada', 'Desfazer', { duration: 6000 }).onAction().subscribe(() => {
                this._service.AtualizarStatusPendencia(p.Id, { EVP_STATUS: anterior }).subscribe({
                    next: () => {
                        this.recarregarPendencias();
                        this._service.NotificarAlteracao(); // atualiza o sino de avisos
                    },
                    error: error => this._snackBar.open(mensagemErro(error, 'Não foi possível desfazer.'), 'X', { duration: 6000 }),
                });
            });
        });
    }

    // Restaurar: a ignorada volta para A fazer.
    restaurarPendencia(p: EventoPendenciaItem, event: Event): void {
        event.stopPropagation();
        this.trocarStatusPendencia(p, StatusPendencia.AFazer, () => {
            this._snackBar.open('Pendência restaurada', 'X', { duration: 3000 });
        });
    }

    estaAlterando(p: EventoPendenciaItem): boolean {
        return this._alterandoStatus.has(p.Id);
    }

    private trocarStatusPendencia(p: EventoPendenciaItem, status: number, depois: () => void): void {
        if (this._alterandoStatus.has(p.Id)) {
            return;
        }
        this._alterandoStatus.add(p.Id);
        this._service.AtualizarStatusPendencia(p.Id, { EVP_STATUS: status }).subscribe({
            next: () => {
                this._alterandoStatus.delete(p.Id);
                this.recarregarPendencias();
                this._service.NotificarAlteracao(); // atualiza o sino de avisos
                depois();
            },
            error: error => {
                this._alterandoStatus.delete(p.Id);
                this._snackBar.open(mensagemErro(error, 'Não foi possível mudar o status.'), 'X', { duration: 6000 });
            },
        });
    }

    // Acrescenta só os modelos do checklist padrão que ainda faltam no evento (idempotente; ignorados não voltam).
    aplicarChecklist(): void {
        if (!this.evento?.Id || this.aplicandoChecklist) {
            return;
        }
        this.aplicandoChecklist = true;
        this._service.AplicarChecklist(this.evento.Id).subscribe({
            next: r => {
                this.aplicandoChecklist = false;
                this.pendencias = r.Itens ?? [];
                const n = r.Adicionadas ?? 0;
                if (n > 0) {
                    this._service.NotificarAlteracao(); // atualiza o sino de avisos
                }
                this._snackBar.open(
                    n === 0 ? 'O checklist padrão já está neste evento.' : n === 1 ? '1 pendência adicionada.' : `${n} pendências adicionadas.`,
                    'X', { duration: 4000 });
            },
            error: error => {
                this.aplicandoChecklist = false;
                this._snackBar.open(mensagemErro(error, 'Não foi possível adicionar o checklist padrão.'), 'X', { duration: 6000 });
            },
        });
    }

    trackPendencia = (_: number, p: EventoPendenciaItem) => p.Id;

    ctrl(nome: string): FormControl {
        return this.form.get(nome) as FormControl;
    }

    // Sugestão escolhida no campo Local: a cidade acompanha o lugar.
    aoEscolherLocal(s: LocalSugestao): void {
        if (s.Cidade) {
            const cidade = this.ctrl('EVE_CIDADE');
            cidade.setValue(s.Cidade.slice(0, 100));
            cidade.markAsDirty();
        }
    }

    // Sugestão escolhida na largada/chegada: preenche o link do Maps com as coordenadas do lugar.
    aoEscolherPonto(campoLink: string, s: LocalSugestao): void {
        const link = this.ctrl(campoLink);
        link.setValue(s.LinkMaps);
        link.markAsDirty();
    }

    // Uma mensagem por campo.
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

    private preencher(e: Evento | null): void {
        const query = this._route.snapshot.queryParamMap.get('data');
        // ?data= pré-preenche a data do evento novo (usado pela Visão do dia).
        const data = parseDataIso(e?.EVE_DATA) ?? (e ? null : parseDataIso(query));
        this.form.reset({
            EVE_NOME: e?.EVE_NOME ?? '',
            EVE_TIPO_EVENTO_ID: e?.EVE_TIPO_EVENTO_ID ?? null,
            EVE_DATA: data,
            EVE_HORA: horaDaApi(e?.EVE_HORA),
            EVE_HORA_A_CONFIRMAR: !e?.EVE_HORA,
            EVE_CIDADE: e?.EVE_CIDADE ?? '',
            EVE_LOCAL: e?.EVE_LOCAL ?? '',
            EVE_STATUS: e?.EVE_STATUS ?? StatusEvento.Pendente,
            EVE_ORGANIZADOR_ID: e?.EVE_ORGANIZADOR_ID ?? null,
            EVE_LARGADA_LOCAL: e?.EVE_LARGADA_LOCAL ?? '',
            EVE_LARGADA_LINK: e?.EVE_LARGADA_LINK ?? '',
            EVE_CHEGADA_LOCAL: e?.EVE_CHEGADA_LOCAL ?? '',
            EVE_CHEGADA_LINK: e?.EVE_CHEGADA_LINK ?? '',
            EVE_LINK_INSCRICAO: e?.EVE_LINK_INSCRICAO ?? '',
            EVE_LINK_FOTOS: e?.EVE_LINK_FOTOS ?? '',
            EVE_ROTA_LINK_MAPS: e?.EVE_ROTA_LINK_MAPS ?? '',
            EVE_ROTA_LINK_STRAVA: e?.EVE_ROTA_LINK_STRAVA ?? '',
            EVE_INFORMACOES: e?.EVE_INFORMACOES ?? '',
            EVE_OBSERVACOES_EQUIPE: e?.EVE_OBSERVACOES_EQUIPE ?? '',
            EVE_NOTAS_INTERNAS: e?.EVE_NOTAS_INTERNAS ?? '',
        });
        this.aplicarAConfirmar(!e?.EVE_HORA, false);
    }

    private aplicarAConfirmar(aConfirmar: boolean, limpar: boolean): void {
        const hora = this.form.get('EVE_HORA')!;
        if (aConfirmar) {
            if (limpar) {
                hora.setValue('', { emitEvent: false });
            }
            hora.disable({ emitEvent: false });
        } else {
            hora.enable({ emitEvent: false });
        }
    }

    // Depois de mudar a data o conflito de cada membro muda: relê a escala.
    private recarregarEquipe(): void {
        if (!this.evento?.Id) {
            return;
        }
        this._service.Membros(this.evento.Id).subscribe({
            next: equipe => (this.equipe = equipe),
            error: () => { /* mantém a escala na tela; o alerta fica desatualizado até recarregar */ },
        });
    }

    private falhaAoSalvar(error: any): void {
        this.salvando = false;
        this._snackBar.open(mensagemErro(error, 'Não foi possível salvar o evento.'), 'X', { duration: 6000 });
    }
}
