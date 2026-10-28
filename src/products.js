/**
 * Product catalog loader and preloader for BEYOND
 */

export async function loadProductsManifest(onProgress) {
  const res = await fetch('/products/manifest.json');
  const manifest = await res.json();
  const products = [];

  const total = manifest.length;
  for (let i = 0; i < total; i++) {
    const item = manifest[i];
    if (onProgress) onProgress((i + 0.3) / total, `Loading ${item.name}...`);

    const pRes = await fetch(item.jsonUrl);
    const pData = await pRes.json();
    products.push(pData);

    if (onProgress) onProgress((i + 1) / total, `Loaded ${item.name}`);
  }

  return products;
}

/**
 * Preloads critical rail and front images using img.decode()
 */
export async function preloadCriticalImages(products, onProgress) {
  const promises = [];
  let loaded = 0;
  const total = products.length * 2;

  for (const p of products) {
    const firstCol = p.colors[0];
    const urls = [firstCol.sideRail, firstCol.frontRail];

    for (const url of urls) {
      const img = new Image();
      img.src = url;
      const prm = (img.decode ? img.decode() : new Promise(r => { img.onload = r; img.onerror = r; }))
        .catch(() => {})
        .finally(() => {
          loaded++;
          if (onProgress) onProgress(loaded / total, 'Preloading collection...');
        });
      promises.push(prm);
    }
  }

  await Promise.all(promises);
}
