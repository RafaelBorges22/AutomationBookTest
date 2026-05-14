import SwaggerParser from "@apidevtools/swagger-parser";
import { askUserInputs, askMethodConfig, closeInterface } from "./components/cli.ts";
import { generateTestCases } from "./components/scenarioGenerator.ts";
import { writeExcel } from "./components/excelWrite.ts"; 
import type { MethodConfig } from "./components/types.ts";

async function run(): Promise<void> {
  try {
    // 1. Coleta dados (Z-Number, E-mail e o caminho do Swagger)
    const { userEmail, swaggerFilePath } = await askUserInputs();

    // 2. Analisa o Swagger
    console.log("\n🔍 Analisando o Swagger...");
    // Usamos o dereference para que os $ref sejam resolvidos internamente
    const api: any = await SwaggerParser.dereference(swaggerFilePath);

    // 3. Configura cada endpoint encontrado
    const methodConfigs = new Map<string, MethodConfig>();
    
    for (const [path, methods] of Object.entries(api.paths)) {
      for (const method of Object.keys(methods as Record<string, any>)) {
        
        // --- AJUSTE AQUI ---
        // Passamos o swaggerFilePath para que o askMethodConfig possa extrair o body
        const config = await askMethodConfig(method, path, swaggerFilePath);
        // -------------------

        methodConfigs.set(`${method.toUpperCase()}:${path}`, config);
      }
    }

    // 4. Gera a lista de casos
    // O scenarioGenerator agora deve estar pronto para receber o config.requestBody
    const testCases = generateTestCases(api, methodConfigs, userEmail);
    
    // 5. Gera o Excel
    console.log(`\n⚙️  Gerando planilha com ${testCases.length} cenários...`);
    await writeExcel(testCases);

    console.log("\n🚀 Processo concluído com sucesso!");

  } catch (err) {
    console.error("\n❌ Erro durante a execução:", err);
    process.exit(1);
  } finally {
    closeInterface();
  }
}

run();