const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'CyrusIcon.png');
const outputPath = path.join(__dirname, '..', 'resources', 'CyrusIcon.ico');

pngToIco(inputPath)
  .then((buf) => {
    fs.writeFileSync(outputPath, buf);
    console.log(`Icon converted successfully: ${outputPath}`);
  })
  .catch((err) => {
    console.error('Error converting icon:', err);
    process.exit(1);
  });