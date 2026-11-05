import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({providedIn: 'root'})
export class FuseLoadingService
{
    private _auto$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
    private _mode$: BehaviorSubject<'determinate' | 'indeterminate'> = new BehaviorSubject<'determinate' | 'indeterminate'>('indeterminate');
    private _progress$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(0);
    private _show$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    // Contagem por URL (não só true/false) — com um Map<string, boolean> simples, duas
    // requisições concorrentes pra mesma URL faziam a primeira a terminar apagar a entrada da
    // segunda, escondendo a barra enquanto a segunda ainda estava em andamento (ou deixando o
    // estado de show$ dessincronizado do que realmente está pendente).
    private _urlMap: Map<string, number> = new Map<string, number>();

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient)
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for auto mode
     */
    get auto$(): Observable<boolean>
    {
        return this._auto$.asObservable();
    }

    /**
     * Getter for mode
     */
    get mode$(): Observable<'determinate' | 'indeterminate'>
    {
        return this._mode$.asObservable();
    }

    /**
     * Getter for progress
     */
    get progress$(): Observable<number>
    {
        return this._progress$.asObservable();
    }

    /**
     * Getter for show
     */
    get show$(): Observable<boolean>
    {
        return this._show$.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Show the loading bar
     */
    show(): void
    {
        this._show$.next(true);
    }

    /**
     * Hide the loading bar
     */
    hide(): void
    {
        this._show$.next(false);
    }

    /**
     * Set the auto mode
     *
     * @param value
     */
    setAutoMode(value: boolean): void
    {
        this._auto$.next(value);
    }

    /**
     * Set the mode
     *
     * @param value
     */
    setMode(value: 'determinate' | 'indeterminate'): void
    {
        this._mode$.next(value);
    }

    /**
     * Set the progress of the bar manually
     *
     * @param value
     */
    setProgress(value: number): void
    {
        if ( value < 0 || value > 100 )
        {
            console.error('Progress value must be between 0 and 100!');
            return;
        }

        this._progress$.next(value);
    }

    /**
     * Sets the loading status on the given url
     *
     * @param status
     * @param url
     */
    _setLoadingStatus(status: boolean, url: string): void
    {
        // Return if the url was not provided
        if ( !url )
        {
            console.error('The request URL must be provided!');
            return;
        }

        if ( status === true )
        {
            this._urlMap.set(url, (this._urlMap.get(url) ?? 0) + 1);
            this._show$.next(true);
        }
        else if ( status === false && this._urlMap.has(url) )
        {
            const restantes = this._urlMap.get(url) - 1;
            if ( restantes <= 0 )
                this._urlMap.delete(url);
            else
                this._urlMap.set(url, restantes);
        }

        // Only set the status to 'false' if all outgoing requests are completed
        if ( this._urlMap.size === 0 )
        {
            this._show$.next(false);
        }
    }
}
