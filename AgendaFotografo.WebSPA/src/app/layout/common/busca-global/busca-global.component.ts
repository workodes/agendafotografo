import { Overlay } from '@angular/cdk/overlay';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_AUTOCOMPLETE_SCROLL_STRATEGY, MatAutocomplete, MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EventoListItem } from 'app/models/DTOs/responses/EventoListItem';
import { STATUS_EVENTO_COR, STATUS_EVENTO_ROTULO } from 'app/models/enums/StatusEvento';
import { EventoService } from 'app/services/evento.service';
import { mesDaData } from 'app/utils/calendario';
import { formatarData } from 'app/utils/data-evento';
import { catchError, debounceTime, distinctUntilChanged, map, of, Subject, switchMap, takeUntil } from 'rxjs';

const MIN_CARACTERES = 2;
const MAX_RESULTADOS = 8;
const VER_NA_AGENDA = '__agenda__';

// Busca global de eventos do cabeçalho (só Assinante). Adaptada do `search` do Fuse, mas chamando o Evento/Listar?busca= que já existe.
// Mínimo de 2 caracteres, debounce de 600 ms, até 8 resultados. Enter ou clique abre a ficha; "Ver na Agenda" no fim.
// `modo`: 'campo' = caixa de busca no cabeçalho (telas largas); 'barra' = ícone que abre uma barra sobre o cabeçalho (celular/tablet).
@Component({
    selector: 'busca-global',
    templateUrl: './busca-global.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NgClass, NgFor, NgIf, ReactiveFormsModule, MatAutocompleteModule, MatButtonModule, MatIconModule],
    providers: [
        {
            provide: MAT_AUTOCOMPLETE_SCROLL_STRATEGY,
            useFactory: () => {
                const overlay = inject(Overlay);
                return () => overlay.scrollStrategies.block();
            },
        },
    ],
})
export class BuscaGlobalComponent implements OnInit, OnDestroy {
    @Input() modo: 'campo' | 'barra' = 'campo';

    readonly STATUS_ROTULO = STATUS_EVENTO_ROTULO;
    readonly STATUS_COR = STATUS_EVENTO_COR;
    readonly VER_NA_AGENDA = VER_NA_AGENDA;
    readonly formatarData = formatarData;

    readonly busca = new FormControl<string>('', { nonNullable: true });
    aberta = false;
    /** null = nada a mostrar (menos de 2 caracteres); [] = sem resultados. */
    resultados: EventoListItem[] | null = null;
    erro = false;
    private readonly _unsubscribeAll = new Subject<void>();

    @ViewChild('autocomplete') autocomplete: MatAutocomplete;

    /** Foca o campo assim que a barra aparece no DOM. */
    @ViewChild('campoBarra')
    set campoBarra(el: ElementRef<HTMLInputElement> | undefined) {
        if (el) {
            setTimeout(() => el.nativeElement.focus());
        }
    }

    constructor(
        private _eventoService: EventoService,
        private _router: Router,
        private _changeDetectorRef: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.busca.valueChanges
            .pipe(
                map(v => (typeof v === 'string' ? v : '').trim()),
                debounceTime(600),
                distinctUntilChanged(),
                switchMap(termo => {
                    if (termo.length < MIN_CARACTERES) {
                        return of({ lista: null as EventoListItem[] | null, erro: false });
                    }
                    // Mais recentes primeiro: sem data inicial, a ordem padrão traria os eventos mais antigos.
                    return this._eventoService.GetAllPaginated(1, MAX_RESULTADOS, { busca: termo, ordem: 'desc' }).pipe(
                        map(r => ({ lista: (r.Data ?? []) as EventoListItem[] | null, erro: false })),
                        catchError(() => of({ lista: [] as EventoListItem[] | null, erro: true })),
                    );
                }),
                takeUntil(this._unsubscribeAll),
            )
            .subscribe(r => {
                this.resultados = r.lista;
                this.erro = r.erro;
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    abrir(): void {
        this.aberta = true;
    }

    fechar(): void {
        if (!this.aberta) {
            return;
        }
        this.busca.setValue('');
        this.resultados = null;
        this.aberta = false;
    }

    /** Escape fecha a barra (se a lista de resultados já estiver fechada). */
    aoTeclar(event: KeyboardEvent): void {
        if (event.key === 'Escape' && this.modo === 'barra' && !this.autocomplete?.isOpen) {
            this.fechar();
        }
    }

    /** Descarta o texto do campo ao escolher um item (o valor da opção é só o id). */
    exibirVazio = (): string => '';

    selecionar(event: MatAutocompleteSelectedEvent): void {
        const valor = event.option.value as string;
        const primeiro = this.resultados?.[0];
        this.busca.setValue(''); // o autocomplete grava o id da opção no campo; o '' seguinte (dentro do debounce) substitui
        this.resultados = null;
        this.erro = false;

        if (valor === VER_NA_AGENDA) {
            const mes = mesDaData(primeiro?.EVE_DATA);
            this._router.navigate(['/assinante/agenda'], { queryParams: mes ? { mes } : undefined });
        } else if (valor) {
            this._router.navigate(['/assinante/eventos', valor]);
        }
        this._changeDetectorRef.markForCheck();
        if (this.modo === 'barra') {
            this.aberta = false;
        }
    }

    trackById(_: number, e: EventoListItem): string {
        return e.Id;
    }
}
