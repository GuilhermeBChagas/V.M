/**
 * Redimensiona e comprime uma string base64 ou File
 * @param base64Str String base64 original
 * @param maxWidth Largura máxima permitida
 * @param quality Qualidade da compressão (0 a 1)
 */
export const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Mantém a proporção se for maior que o maxWidth
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Str);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Exporta como JPEG comprimido
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
        };
        img.onerror = () => {
            resolve(base64Str);
        };
    });
};
