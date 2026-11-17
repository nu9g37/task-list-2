import { readFile } from "node:fs/promises";
import ts from "typescript";

const urlCache = new Map();

async function resolveTsUrl(filePath) {
  if (urlCache.has(filePath)) return urlCache.get(filePath);
  const source = await readFile(filePath, "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const matches = [
    ...outputText.matchAll(/((?:from|import)\s+)(["'])(@\/[^"']+)\2/g),
  ];
  for (const [full, prefix, quote, specifier] of matches) {
    const targetUrl = await resolveTsUrl(`src/${specifier.slice(2)}.ts`);
    outputText = outputText.replaceAll(
      full,
      `${prefix}${quote}${targetUrl}${quote}`,
    );
  }
  const url =
    "data:text/javascript;base64," + Buffer.from(outputText).toString("base64");
  urlCache.set(filePath, url);
  return url;
}

export async function importTs(filePath) {
  return import(await resolveTsUrl(filePath));
}
