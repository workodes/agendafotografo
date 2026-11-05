import { inject } from '@angular/core';
import { NavigationService } from 'app/core/navigation/navigation.service';

// Dados necessários antes de renderizar qualquer rota protegida: só o menu da role logada.
export const initialDataResolver = () => inject(NavigationService).get();
