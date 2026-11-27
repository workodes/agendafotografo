/* eslint-disable @typescript-eslint/naming-convention */
// GET Auth/Modulos (plano 24; só Assinante, no-store): plano e módulos liberados (números do enum ModuloPlano).
export class ModulosUsuario {
    /** Nome do plano; null = conta sem plano (só a base). */
    PlanoNome: string | null;
    Modulos: number[];
}
