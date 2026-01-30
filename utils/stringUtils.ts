/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas.
 * Isso permite buscas flexíveis onde "João" pode ser encontrado buscando "joao".
 */
export const normalizeString = (str: string): string => {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Verifica se uma string contém outra, ignorando acentos e maiúsculas/minúsculas.
 */
export const flexibleIncludes = (text: string, search: string): boolean => {
    return normalizeString(text).includes(normalizeString(search));
};
