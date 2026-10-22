// Redimensiona una imagen en el navegador y la devuelve como data URL pequeño,
// para poder guardarla directo en el registro del profesor (D1) sin usar un almacenamiento de archivos aparte.
export function resizeImageToDataUrl(file, maxSize = 160, quality = 0.8) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
		reader.onload = () => {
			const img = new Image();
			img.onerror = () => reject(new Error('No se pudo procesar la imagen'));
			img.onload = () => {
				const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
				const canvas = document.createElement('canvas');
				canvas.width = Math.round(img.width * scale);
				canvas.height = Math.round(img.height * scale);
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				resolve(canvas.toDataURL('image/jpeg', quality));
			};
			img.src = reader.result;
		};
		reader.readAsDataURL(file);
	});
}
