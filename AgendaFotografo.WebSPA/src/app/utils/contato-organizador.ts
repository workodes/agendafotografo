import { formatTelefone } from './format-telefone';

/** Bloco "Organizador" do link público e do detalhe da escala (equipe sabe com quem falar no dia). */
export interface ContatoOrganizador {
    nome: string | null;
    /** Telefone formatado para exibir ((11) 98765-4321 / (11) 3265-4321); null sem telefone. */
    telefone: string | null;
    /** `https://wa.me/55<dígitos>`; null quando o telefone não tem 10 ou 11 dígitos (DDD + número). */
    whatsapp: string | null;
    /** `tel:+55<dígitos>`; mesma regra do WhatsApp. */
    ligar: string | null;
}

/**
 * Monta o contato a partir de `OrganizadorNome` e `OrganizadorTelefone` (a API manda só dígitos).
 * Sem nome e sem telefone = null (o bloco não aparece). Os links só levam dígitos, nunca texto livre.
 */
export function contatoOrganizador(nome: string | null | undefined, telefone: string | null | undefined): ContatoOrganizador | null {
    const n = nome?.trim() || null;
    const d = (telefone ?? '').replace(/\D/g, '');
    if (!n && !d) {
        return null;
    }
    const valido = d.length === 10 || d.length === 11;
    return {
        nome: n,
        telefone: d ? formatTelefone(d) : null,
        whatsapp: valido ? `https://wa.me/55${d}` : null,
        ligar: valido ? `tel:+55${d}` : null,
    };
}
