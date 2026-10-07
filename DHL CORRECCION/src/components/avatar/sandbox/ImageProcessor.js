export function processImageToParticles(imageSrc, config = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Downsample to a reasonable grid resolution to control particle density
      const maxRes = 250;
      let w = img.width;
      let h = img.height;
      if (w > maxRes || h > maxRes) {
        if (w > h) {
          h = Math.round((h * maxRes) / w);
          w = maxRes;
        } else {
          w = Math.round((w * maxRes) / h);
          h = maxRes;
        }
      }
      
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      
      const imgData = ctx.getImageData(0, 0, w, h).data;
      const positions = [];
      const originalColors = [];
      
      const maxParticles = config.maxParticles || 250000;
      const threshold = config.threshold !== undefined ? config.threshold : 20;
      const removeDarkBackground = config.removeDarkBackground !== undefined ? config.removeDarkBackground : true;
      const depthMode = config.depthMode || 'VOLUMETRIC_FAKE_3D';
      const depthStrength = config.depthStrength !== undefined ? config.depthStrength : 0.25;
      
      // Extract active pixels that pass alpha and brightness checks
      const activePixels = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const a = imgData[idx + 3];
          
          if (a < 20) continue;
          
          const brightness = (r + g + b) / 3;
          if (brightness < threshold) continue;
          
          if (removeDarkBackground) {
            // Ignore dark grays and blacks
            if (r < 25 && g < 25 && b < 25) continue;
          }
          
          activePixels.push({ x, y, r, g, b, brightness });
        }
      }
      
      if (activePixels.length === 0) {
        reject(new Error("No active pixels found with current threshold configuration."));
        return;
      }
      
      // Find bounding box of active pixels for perfect centering & auto-scaling
      let minX = w;
      let maxX = 0;
      let minY = h;
      let maxY = 0;
      
      for (let i = 0; i < activePixels.length; i++) {
        const p = activePixels[i];
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const spanX = Math.max(1, maxX - minX);
      const spanY = Math.max(1, maxY - minY);
      const maxSpan = Math.max(spanX, spanY);

      // Distribute points among active pixels to reach the desired density
      const pointsPerPixel = Math.max(1, Math.ceil(maxParticles / activePixels.length));
      
      for (let i = 0; i < activePixels.length; i++) {
        const p = activePixels[i];
        
        for (let k = 0; k < pointsPerPixel; k++) {
          if (positions.length / 3 >= maxParticles) break;
          
          // Jitter offset for smooth point cloud distributions
          const jitterX = pointsPerPixel > 1 ? (Math.random() - 0.5) * 0.8 : 0;
          const jitterY = pointsPerPixel > 1 ? (Math.random() - 0.5) * 0.8 : 0;
          
          // Center the active area bounding box at (0, 0) and scale to [-0.75, 0.75]
          const nx = (((p.x + jitterX) - centerX) / maxSpan) * 1.5;
          const ny = ((centerY - (p.y + jitterY)) / maxSpan) * 1.5;
          
          // Reconstruct Depth (Z axis)
          let nz = 0;
          const distFromCenter = Math.sqrt(nx * nx + ny * ny);
          
          if (depthMode === 'BRIGHTNESS_DEPTH') {
            nz = (p.brightness / 255.0) * depthStrength;
          } else if (depthMode === 'RADIAL_DEPTH') {
            nz = Math.max(0, 1.0 - distFromCenter) * depthStrength;
          } else if (depthMode === 'NOISE_DEPTH') {
            nz = (Math.random() - 0.5) * depthStrength;
          } else if (depthMode === 'VOLUMETRIC_FAKE_3D') {
            const radial = Math.max(0, 1.0 - distFromCenter) * 0.5;
            nz = ((p.brightness / 255.0) + radial) * depthStrength;
          } else {
            // FLAT
            nz = 0;
          }
          
          positions.push(nx, ny, nz);
          originalColors.push(p.r / 255.0, p.g / 255.0, p.b / 255.0);
        }
      }
      
      resolve({
        positions: new Float32Array(positions),
        originalColors: new Float32Array(originalColors),
        count: positions.length / 3,
        aspectRatio: w / h
      });
    };
    img.onerror = (e) => reject(new Error("Failed to load or parse image source."));
  });
}
