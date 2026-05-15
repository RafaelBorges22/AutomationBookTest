import { extractParams } from "./paramExtractor.ts";
import type {
  TestScenario,
  MethodConfig,
  GeneratedTestCase,
  Operation,
  PathItem,
} from "./types.ts";

function buildScenariosForStatus(
  statusCode: string,
  endpointDetails: Operation,
  mandatoryParamsMap: Record<string, any>
): TestScenario[] {
  const scenarios: TestScenario[] = [];

  // Cenários de Sucesso
  if (statusCode.startsWith("2")) {
    const requestExamples = endpointDetails.requestBody?.content?.["application/json"]?.examples;
    if (requestExamples) {
      for (const exampleKey of Object.keys(requestExamples)) {
        scenarios.push({ label: "Sucesso", statusCode, exampleKey });
      }
    } else {
      scenarios.push({ label: "Sucesso", statusCode });
    }
    return scenarios;
  }

  // Cenários de Erro (400, 422) - Aqui gera um para cada parâmetro obrigatório
  if (statusCode === "400" || statusCode === "422") {
    const mandatoryParamsKeys = Object.keys(mandatoryParamsMap);
    if (mandatoryParamsKeys.length > 0) {
      for (const param of mandatoryParamsKeys) {
        scenarios.push({
          label: "Falha de Validação",
          statusCode,
          omittedParam: param,
        });
      }
    } else {
      scenarios.push({ label: "Erro de Validação Genérico", statusCode });
    }
  } else {
    // Definimos qual parâmetro técnico está associado ao erro
    let targetParam = "N/A";

    if (statusCode === "401" || statusCode === "403") {
      targetParam = "Authorization: INVALIDO ou AUSENTE";
    } else if (statusCode === "404") {
      targetParam = "URL incorreta";
    } else if (statusCode === "405") {
      targetParam = "Método http invalido";
    } else if (statusCode === "406") {
      targetParam = "Accept invalido";
    } else if (statusCode === "415") {
      targetParam = "Content-Type invalido";
    } else if (statusCode === "500") {
      targetParam = "Server Side";
    }

    // Agora passamos o omittedParam para o objeto
    scenarios.push({ 
      label: `Erro ${statusCode}`, 
      statusCode, 
      omittedParam: targetParam // <-- Isso aqui alimenta seu Excel e o StepBuilder
    });
  }

  return scenarios;
}

export function generateTestCases(
  api: any,
  methodConfigs: Map<string, MethodConfig>,
  userEmail: string,
  productAreas: string
): GeneratedTestCase[] {
  const results: GeneratedTestCase[] = [];

  for (const [path, methods] of Object.entries(api.paths)) {
    const pathData = methods as PathItem;

    for (const [method, details] of Object.entries(pathData)) {
      if (["parameters", "summary", "description", "servers", "$ref"].includes(method)) continue;

      const configKey = `${method.toUpperCase()}:${path}`;
      const methodConfig = methodConfigs.get(configKey);
      if (!methodConfig) continue;

      const operation = details as Operation;
      const responses = operation.responses || {};
      // Extrai parâmetros obrigatórios para gerar os cenários de erro
      const mandatoryParamsMap = extractParams(api, path, method, pathData);

      // PERCORRE TODOS OS STATUS CODES DO SWAGGER
      for (const statusCode of Object.keys(responses)) {
        const scenarios = buildScenariosForStatus(statusCode, operation, mandatoryParamsMap);

        for (const scenario of scenarios) {
          results.push({
            ctFormatado: methodConfig.summary,
            scenario,
            methodConfig,
            endpointDesc: operation.description || operation.summary || "",
            userEmail,
            productAreas,
            mandatoryParams: mandatoryParamsMap,
          });
        }
      }
    }
  }
  return results;
}