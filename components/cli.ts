import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { UserInputs, MethodConfig } from "./types.ts";

let rl: readline.Interface | null = null;

function getInterface(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({ input, output });
  }
  return rl;
}

export function closeInterface(): void {
  rl?.close();
  rl = null;
}

export async function askUserInputs(): Promise<UserInputs> {
  const iface = getInterface();

  const zInput = await iface.question("➤ Qual o seu número Z (ex: Z123456)? ");
  const zNumber = zInput.trim().toUpperCase();
  const userEmail = `${zNumber}@claro.com.br`;

  const fileInput = await iface.question("➤ Digite o nome do arquivo Swagger (ex: mobile.json): ");
  const swaggerFilePath = `./documentation/${fileInput.trim()}`;

  return { zNumber, userEmail, swaggerFilePath };
}

export async function askMethodConfig(method: string, path: string): Promise<MethodConfig> {
  const iface = getInterface();
  console.log(`\n--- Configurando: [${method.toUpperCase()}] ${path} ---`);
  
  const url = await iface.question(`  URL do ambiente (ex: https://api.claro.com.br/v1): `);
  const summary = await iface.question(`  ID Base para os Casos de Teste (ex: API-CT-024): `);

  return { path, method, url: url.trim(), summary: summary.trim() };
}