const fs = require('fs');
const path = require('path');

// Simple PNG generator for PWA icons
// Using a minimal canvas implementation
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1e40af');
    gradient.addColorStop(1, '#3b82f6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Rounded corners
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    const radius = size * 0.156; // ~80 for 512
    ctx.roundRect(0, 0, size, size, radius);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
    // Wrench icon
    ctx.fillStyle = 'white';
    const centerX = size / 2;
    const centerY = size / 2;
    const scale = size / 512;
    
    // Draw wrench path scaled
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    
    // Wrench path (from SVG)
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(-24, 48);
    ctx.lineTo(-48, 48);
    ctx.lineTo(-48, 72);
    ctx.lineTo(0, 72);
    ctx.lineTo(0, 96);
    ctx.lineTo(24, 96);
    ctx.lineTo(24, 72);
    ctx.lineTo(48, 72);
    ctx.lineTo(48, 48);
    ctx.lineTo(24, 48);
    ctx.lineTo(24, 0);
    ctx.closePath();
    
    // Circle cutout
    ctx.moveTo(-24, -24);
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    
    ctx.fill();
    ctx.restore();
    
    // Save
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, '..', 'public', `icon-${size}.png`);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Generated icon-${size}.png`);
  }
  
  console.log('All icons generated!');
}

generateIcons().catch(console.error);