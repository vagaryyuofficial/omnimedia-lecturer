import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageEntry = require.resolve("@huggingface/transformers");
const packageRoot = dirname(dirname(packageEntry));
const targetDirectory = join(projectRoot, "public", "vendor");

await mkdir(targetDirectory, { recursive: true });
await Promise.all([
  copyFile(
    join(packageRoot, "dist", "transformers.min.js"),
    join(targetDirectory, "transformers.min.js"),
  ),
  copyFile(
    join(packageRoot, "LICENSE"),
    join(targetDirectory, "transformers.LICENSE.txt"),
  ),
]);

console.log("Synced the worker-safe Transformers.js runtime into public/vendor.");
