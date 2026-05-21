import JSZip from 'jszip';

/**
 * Procesa un archivo (File) y devuelve la configuración para LayoutLoader.
 * Soporta .obj, .glb, .gltf y .zip (este último con descompresión).
 * 
 * @param {File} file 
 * @returns {Promise<{url: string, type: string, name: string, blobMap?: Map<string, string>}>}
 */
export async function process3DFile(file) {
    if (!file) throw new Error("No file provided");

    const fileName = file.name.toLowerCase();

    // Caso 1: Archivos directos soportados
    if (fileName.endsWith('.obj') || fileName.endsWith('.glb') || fileName.endsWith('.gltf') || fileName.endsWith('.fbx')) {
        return {
            url: URL.createObjectURL(file),
            type: fileName.split('.').pop(),
            name: file.name
        };
    }

    // Caso 2: Archivos ZIP
    if (fileName.endsWith('.zip')) {
        console.log("Procesando ZIP...", file.name);
        const zip = new JSZip();
        // Cargar zip
        await zip.loadAsync(file);

        const blobMap = new Map();
        let mainFile = null;

        // Promesas para extraer todos los archivos
        const sitePromises = [];

        zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return; // Ignorar directorios

            // Ignorar archivos basura de MACOSX
            if (relativePath.includes('__MACOSX') || relativePath.startsWith('._')) return;

            const promise = zipEntry.async('blob').then(blob => {
                const entryName = relativePath.split('/').pop(); // Nombre base para el mapa flat
                const blobUrl = URL.createObjectURL(blob);
                blobMap.set(entryName, blobUrl);

                const lowerName = entryName.toLowerCase();
                // Buscar archivo principal (prioridad a GLB/GLTF, luego OBJ/FBX)
                if (lowerName.endsWith('.glb') || lowerName.endsWith('.gltf')) {
                    mainFile = {
                        name: entryName,
                        url: blobUrl,
                        type: lowerName.endsWith('.glb') ? 'glb' : 'gltf'
                    };
                } else if (lowerName.endsWith('.obj') && !mainFile) {
                    mainFile = { name: entryName, url: blobUrl, type: 'obj' };
                } else if (lowerName.endsWith('.fbx') && !mainFile) {
                    mainFile = { name: entryName, url: blobUrl, type: 'fbx' };
                }
            });
            sitePromises.push(promise);
        });

        await Promise.all(sitePromises);

        if (!mainFile) {
            throw new Error("El archivo ZIP no contiene ningún modelo 3D válido (.obj, .glb, .gltf, .fbx)");
        }

        return {
            url: mainFile.url,
            type: mainFile.type,
            name: file.name, // Nombre del zip original
            blobMap // Mapa para texturas
        };
    }

    throw new Error("Formato de archivo no soportado. Use .obj, .glb, .gltf, .fbx o .zip");
}
