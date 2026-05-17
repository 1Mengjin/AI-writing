import { readFile } from "fs/promises";
import path from "path";

export async function getWenfengPrompt() {
  const filePath = path.join(process.cwd(), "docs", "Prompt集.md");
  const text = await readFile(filePath, "utf8");
  const start = text.indexOf("【文风指纹提取器】");
  const end = text.indexOf("【OOC 哨兵判定 Prompt】");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("未找到文风指纹提取器 Prompt");
  }

  return text.slice(start, end).trim();
}

export async function getOocPrompt() {
  const filePath = path.join(process.cwd(), "docs", "Prompt集.md");
  const text = await readFile(filePath, "utf8");
  const start = text.indexOf("【OOC 哨兵判定 Prompt】");
  const end = text.indexOf("【风格锁定与变奏 Prompt】");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("未找到 OOC 哨兵判定 Prompt");
  }

  return text.slice(start, end).trim();
}
