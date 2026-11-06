// Sugestão do autocomplete de locais (api/Local/Buscar, Geoapify). Nomes iguais ao C# (PropertyNamingPolicy = null).
export interface LocalSugestao {
    Nome: string;
    Endereco: string;
    Cidade: string | null;
    Uf: string | null;
    Latitude: number;
    Longitude: number;
    LinkMaps: string;
}
