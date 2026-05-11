const fs = require('fs');
const path = require('path');

const dir = 'D:/Desktop/Y4 (full)/RP/Hello Tamil/frontend/app/modules/bilingual_translation/games';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add import for saveGameLog
  if (content.includes("from \"../../../../services/api\"")) {
    if (!content.includes("saveGameLog")) {
      content = content.replace(/from \"\.\.\/\.\.\/\.\.\/\.\.\/services\/api\"/, "from \"../../../../services/api\""); // just in case
      content = content.replace(/(import .*API_URL.*)from \"\.\.\/\.\.\/\.\.\/\.\.\/services\/api\";/, "$1, saveGameLog } from \"../../../../services/api\";");
      content = content.replace(/import { getWords, API_URL } from "\.\.\/\.\.\/\.\.\/\.\.\/services\/api";/, "import { getWords, API_URL, saveGameLog } from \"../../../../services/api\";");
      content = content.replace(/import { API_URL, getPictureQuizWords } from "\.\.\/\.\.\/\.\.\/\.\.\/services\/api";/, "import { API_URL, getPictureQuizWords, saveGameLog } from \"../../../../services/api\";");
    }
  } else if (content.includes("from '../../../../services/api'")) {
    if (!content.includes("saveGameLog")) {
      content = content.replace(/import { API_URL } from '\.\.\/\.\.\/\.\.\/\.\.\/services\/api';/, "import { API_URL, saveGameLog } from '../../../../services/api';");
    }
  }

  // Replace fetch with saveGameLog
  // For wordhunt.tsx
  if (content.includes("void fetch(`${API_URL}/game-log`")) {
    content = content.replace(/void fetch\(`\$\{API_URL\}\/game-log`, \{[\s\S]*?\}\)\.catch\(\(error\) => \{[\s\S]*?\}\);/g, "void saveGameLog(gameLog);");
    changed = true;
  }
  // For picturequiz.tsx and others using try/catch
  if (content.includes("await fetch(`${API_URL}/game-log`")) {
    content = content.replace(/try \{[\s]*await fetch\(`\$\{API_URL\}\/game-log`, \{[\s\S]*?\}\);[\s]*\} catch \([^)]+\) \{[\s\S]*?\}/g, "await saveGameLog(gameLog);");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', f);
  }
});
