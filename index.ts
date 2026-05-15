import SwaggerParser from "@apidevtools/swagger-parser";
import { askUserInputs, askMethodConfig, closeInterface } from "./components/cli.ts";
import { generateTestCases } from "./components/scenarioGenerator.ts";
import { writeTestCasesToExcel } from "./components/excelWrite.ts"; 

async function run(): Promise<void> {
  try {
    const { userEmail, swaggerFilePath, productAreas } = await askUserInputs();

    console.log("\n🔍 Analisando o Swagger...");
    const api: any = await SwaggerParser.dereference(swaggerFilePath);

    const methodConfigs = new Map();
    for (const [path, methods] of Object.entries(api.paths)) {
      for (const method of Object.keys(methods as any)) {
        if (["parameters", "$ref"].includes(method)) continue;
        const config = await askMethodConfig(method, path, swaggerFilePath);
        methodConfigs.set(`${method.toUpperCase()}:${path}`, config);
      }
    }

    // O pulo do gato: Passar os 4 parâmetros
    const testCases = generateTestCases(api, methodConfigs, userEmail, productAreas);
    
    console.log(`\n⚙️ Gerando planilha com ${testCases.length} cenários...`);
    await writeTestCasesToExcel(testCases);

    console.log("\n🚀 Processo concluído!");
  } catch (err) {
    console.error("\n❌ Erro:", err);
  } finally {
    closeInterface();
  }
}
run();