
/**
 * Formata uma data no formato YYYY-MM-DD para DD/MM/YYYY sem sofrer com problemas de fuso horário.
 * @param dateStr String de data no formato YYYY-MM-DD
 * @returns String formatada DD/MM/YYYY
 */
export const formatDateBR = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '---';

    // Se a data contiver 'T', é um ISO string completo (timestamp)
    if (dateStr.includes('T')) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    }

    // Se for apenas YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }

    // Fallback para o que for
    return dateStr;
};

/**
 * Retorna a data atual no formato YYYY-MM-DD (Local Time)
 */
export const getTodayLocalDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
