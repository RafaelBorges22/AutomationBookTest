import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { extractResponseBody } from "./swaggerExtractor.ts";
import * as fs from "node:fs/promises";

import type {
  UserInputs,
  MethodConfig,
  PathItem,
  Operation,
  RequestBody,
  MediaType,
} from "./types.ts";

let rl: readline.Interface | null = null;

let cachedSwagger: any = null;
let cachedSwaggerPath = "";

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

async function extractRequestBodyFromSwagger(
  filePath: string,
  path: string,
  method: string
): Promise<any | null> {
  try {
    if (!cachedSwagger || cachedSwaggerPath !== filePath) {
      const content = await fs.readFile(filePath, "utf-8");

      cachedSwagger = JSON.parse(content);
      cachedSwaggerPath = filePath;
    }

    const pathData: PathItem | undefined =
      cachedSwagger.paths?.[path];

    if (!pathData) return null;

    const lowerMethod = method.toLowerCase();

    const operation: Operation | undefined =
      pathData[lowerMethod as keyof PathItem] as
        | Operation
        | undefined;

    if (!operation) return null;

    const requestBody: RequestBody | undefined =
      operation.requestBody;

    if (!requestBody?.content) return null;

    const jsonContent: MediaType | undefined =
      requestBody.content["application/json"];

    if (!jsonContent) return null;

    return (
      jsonContent.example ||
      (jsonContent.examples
        ? (Object.values(jsonContent.examples)[0] as any)?.value
        : null) ||
      jsonContent.schema?.example ||
      null
    );
  } catch (error) {
    console.error(
      `\n⚠️ Erro ao processar Swagger Body: ${error}`
    );

    return null;
  }
}

// No cli.ts, dentro de askUserInputs():

export async function askUserInputs(): Promise<UserInputs> {
  const iface = getInterface();

  const zInput = await iface.question("➤ Qual o seu número Z (ex: Z123456)? ");
  const zNumber = zInput.trim().toUpperCase();
  const userEmail = `${zNumber}@claro.com.br`;

  // --- NOVA PERGUNTA ---
  const productAreas = await iface.question("➤ Digite o Product Areas (ex: Canais Digitais): ");

  const fileInput = await iface.question("➤ Digite o nome do arquivo Swagger (ex: mobile.json): ");
  const swaggerFilePath = `./documentation/${fileInput.trim()}`;

  return {
    zNumber,
    userEmail,
    swaggerFilePath,
    productAreas: productAreas.trim(),
  };
}

export async function askMethodConfig(
  method: string,
  path: string,
  swaggerFilePath: string
): Promise<MethodConfig> {
  const iface = getInterface();

  console.log(
    `\n--- Configurando: [${method.toUpperCase()}] ${path} ---`
  );

  const url = await iface.question(`URL completa do ambiente (ex: https://api-test.claro.com.br/account/v1/nc/com/financialblocks/orders): `);

  const summary = await iface.question(
    `   ID Base (ex: API-CT-024): `
  );

  const requestBody =
    await extractRequestBodyFromSwagger(
      swaggerFilePath,
      path,
      method
    );

  const successResponse = await extractResponseBody(
    swaggerFilePath,
    path,
    method
  );

  if (requestBody) {
    console.log("   ✅ Request Body capturado.");
  }

  if (successResponse) {
    console.log("   ✅ Response Body (200) capturado.");
  }

  return {
    path,
    method,
    url: url.trim(),
    summary: summary.trim(),
    requestBody,
    successResponse,
  };
}