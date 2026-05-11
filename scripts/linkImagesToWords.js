const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const { pathToFileURL } = require("url");

const projectRoot = path.resolve(__dirname, "..");
const backendDir = path.join(projectRoot, "backend");
const imagesRoot = path.join(backendDir, "public", "images");

const backendRequire = createRequire(path.join(backendDir, "package.json"));
const dotenv = backendRequire("dotenv");

dotenv.config({ path: path.join(backendDir, ".env") });

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getImageFileName(folderPath) {
  const files = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  return (
    files.find((fileName) =>
      IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase())
    ) || null
  );
}

async function main() {
  const connectDBModule = await import(
    pathToFileURL(path.join(backendDir, "config", "db.js")).href
  );
  const wordModule = await import(
    pathToFileURL(path.join(backendDir, "src", "translation", "models", "Word.js"))
      .href
  );

  const connectDB = connectDBModule.default;
  const Word = wordModule.default;

  await connectDB();

  if (!fs.existsSync(imagesRoot)) {
    throw new Error(`Images directory not found: ${imagesRoot}`);
  }

  const folders = fs
    .readdirSync(imagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const folderName of folders) {
    const normalizedFolderName = folderName.toLowerCase();
    const folderPath = path.join(imagesRoot, folderName);
    const imageFileName = getImageFileName(folderPath);

    if (!imageFileName) {
      continue;
    }

    const word = await Word.findOne({
      english_meaning: {
        $regex: new RegExp(`^${escapeRegExp(normalizedFolderName)}$`, "i"),
      },
    });

    if (!word) {
      console.log(`No matching word for: ${normalizedFolderName}`);
      continue;
    }

    word.image_url = `/images/${normalizedFolderName}/${imageFileName}`;
    await word.save();
    console.log(`Linked: ${normalizedFolderName}`);
  }

  await Word.db.close();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error linking images to words:", error);
    process.exit(1);
  });
