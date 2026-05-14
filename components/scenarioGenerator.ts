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

  // Cenários de sucesso (2XX)
  if (statusCode.startsWith("2")) {
    const requestExamples =
      endpointDetails.requestBody?.content?.["application/json"]?.examples;

    if (requestExamples) {
      for (const exampleKey of Object.keys(requestExamples)) {
        scenarios.push({ label: "Sucesso", statusCode, exampleKey });
      }
    } else {
      scenarios.push({ label: "Sucesso", statusCode });
    }
    return scenarios;
  }

  // Cenários de falha de validação (400/422)
  if (statusCode === "400" || statusCode === "422") {
    const mandatoryParamsKeys = Object.keys(mandatoryParamsMap);

    if (mandatoryParamsKeys.length > 0) {
      for (const param of mandatoryParamsKeys) {
        const displayParam =
          param === "__requestBody__" ? "Payload Inteiro (Body)" : param;

        scenarios.push({
          label: "Falha de Validação",
          statusCode,
          omittedParam: displayParam, // Aqui entra o campo identificado com '*'
        });
      }
    } else {
      scenarios.push({
        label: "Falha (Bad Request)",
        statusCode,
        omittedParam: "Nenhum parâmetro mapeado",
      });
    }
    return scenarios;
  }

  scenarios.push({ label: "Falha", statusCode });
  return scenarios;
}

export function generateTestCases(
  api: any,
  methodConfigs: Map<string, MethodConfig>,
  userEmail: string
): GeneratedTestCase[] {
  const results: GeneratedTestCase[] = [];

  if (!api?.paths) return results;

  for (const [path, methods] of Object.entries(api.paths)) {
    const pathData = methods as PathItem;

    for (const [method, details] of Object.entries(pathData)) {
      if (["parameters", "summary", "description", "servers", "$ref"].includes(method)) continue;
      if (typeof details !== "object" || details === null) continue;

      const configKey = `${method.toUpperCase()}:${path}`;
      const methodConfig = methodConfigs.get(configKey);
      if (!methodConfig) continue;

      const operation = details as Operation;
      const endpointDesc = operation.description || operation.summary || "";
      const responses = operation.responses || {};
      const sortedStatusCodes = Object.keys(responses).sort();

      // Agora o extractParams já traz os campos com '*'
      const mandatoryParamsMap = extractParams(
        api,
        path,
        method,
        pathData
      );
      for (const statusCode of sortedStatusCodes) {
        const scenarios = buildScenariosForStatus(
          statusCode,
          operation,
          mandatoryParamsMap
        );

        for (const scenario of scenarios) {
          results.push({
            ctFormatado: methodConfig.summary,
            scenario,
            methodConfig,
            endpointDesc,
            userEmail,
            mandatoryParams: mandatoryParamsMap,
          });
        }
      }
    }
  }

  return results;
}