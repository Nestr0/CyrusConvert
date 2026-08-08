const sharp = require('sharp');
const path = require('path');

const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const input = path.join(__dirname, '..', 'CyrusIcon.png');
const outputDir = path.join(__dirname, '..', 'resources', 'icons', 'png');

async function resize() {
  for (const size of sizes) {
    const outputFile = path.join(outputDir, `${size}x${size}.png`);
    await sharp(input).resize(size, size).toFile(outputFile);
    console.log(`Created ${size}x${size}.png`);
  }
}

resize().catch(console.error);