export function extrairHoraDaData(data: Date): string {
    if (!data)
        return null;

    const dataConvertida = new Date(data);

    const horas = String(dataConvertida.getHours()).padStart(2, '0');
    const minutos = String(dataConvertida.getMinutes()).padStart(2, '0');

    return `${horas}:${minutos}`;
}
