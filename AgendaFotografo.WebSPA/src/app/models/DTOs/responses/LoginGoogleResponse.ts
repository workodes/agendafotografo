import { AuthModel } from 'app/models/AuthModel';

// Resposta de POST Auth/LoginGoogle. Nome e Email só vêm quando PrecisaCompletar é true.
export interface LoginGoogleResponse {
    PrecisaCompletar: boolean;
    Login: AuthModel | null;
    Nome: string | null;
    Email: string | null;
}
