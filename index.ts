import SwaggerParser from "@apidevtools/swagger-parser";
import { askUserInputs, askMethodConfig, closeInterface } from "./components/cli.ts";
import { generateTestCases } from "./components/scenarioGenerator.ts";
import { writeExcel } from "./components/excelWrite.ts"; // Certifique-se de usar a versão que te mandei antes
import type { MethodConfig } from "./components/types.ts";

async function run(): Promise<void> {
  try {
    // 1. Coleta dados (Z-Number, etc)
    const { userEmail, swaggerFilePath } = await askUserInputs();

    // 2. Analisa o Swagger
    console.log("\n🔍 Analisando o Swagger...");
    const api: any = await SwaggerParser.dereference(swaggerFilePath);

    // 3. Configura cada endpoint encontrado
    const methodConfigs = new Map<string, MethodConfig>();
    for (const [path, methods] of Object.entries(api.paths)) {
      for (const method of Object.keys(methods as Record<string, any>)) {
        // Aqui o usuário digita a URL e o ID BASE (ex: API-CT-024)
        const config = await askMethodConfig(method, path);
        methodConfigs.set(`${method.toUpperCase()}:${path}`, config);
      }
    }

    // 4. Gera a lista de casos
    const testCases = generateTestCases(api, methodConfigs, userEmail);
    
    // 5. Gera o Excel usando o writeExcel que possui o contador (tcSequence++)
    // e o StepBuilder que gera os textos padronizados.
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