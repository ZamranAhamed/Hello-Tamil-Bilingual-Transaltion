const fs = require('fs');
const path = require('path');
const imagesDir = 'D:/Desktop/Y4 (full)/RP/Hello Tamil/frontend/assets/word-images';
const dirs = fs.readdirSync(imagesDir);
let mapContent = 'export const imageMap: Record<string, any> = {\n';
dirs.forEach(dir => {
  const dirPath = path.join(imagesDir, dir);
  if (fs.statSync(dirPath).isDirectory()) {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
    if (files.length > 0) {
      const file = files[0];
      mapContent += `  "${dir}": require("../assets/word-images/${dir}/${file}"),\n`;
    }
  }
});
mapContent += '};\n';
fs.writeFileSync('D:/Desktop/Y4 (full)/RP/Hello Tamil/frontend/services/imageMap.ts', mapContent);
console.log('imageMap.ts generated.');
