import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const desktopDirectory = dirname(fileURLToPath(import.meta.url));
const source = resolve(desktopDirectory, "../build/desktop/icon.svg");
const target = resolve(desktopDirectory, "../build/desktop/icon.png");

await mkdir(dirname(target), { recursive: true });
await sharp(source).resize(1024, 1024).png().toFile(target);
console.log(`Created ${target}`);
