import { extractParams } from "./paramExtractor.ts";

import type {
  TestScenario,
  MethodConfig,
  GeneratedTestCase,
  Operation,
  PathItem,
} from "./types.ts";

export function extractBusinessRules(
  description: string
): string[] {
  if (!description) {
    return ["Falha de validação genérica"];
  }

  const bulletLines = description
    .split("\n")
    .filter(
      (line) =>
        line.trim().startsWith("*") ||
        line.trim().startsWith("-")
    );

  if (bulletLines.length > 0) {
    return bulletLines.map((rule) =>
      rule.replace(/^[*\-]\s*/, "").trim()
    );
  }

  return [
    description.split("\n")[0] ??
      "Falha de validação genérica",
  ];
}

function buildScenariosForStatus(
  statusCode: string,
  endpointDetails: Operation,
  mandatoryParamsMap: Record<string, any>
): TestScenario[] {
  const scenarios: TestScenario[] = [];

  // Cenários de sucesso (2XX)
  if (statusCode.startsWith("2")) {
    const requestExamples =
      endpointDetails.requestBody?.content?.[
        "application/json"
      ]?.examples;

    if (requestExamples) {
      for (const exampleKey of Object.keys(
        requestExamples
      )) {
        scenarios.push({
          label: "Sucesso",
          statusCode,
          exampleKey,
        });
      }
    } else {
      scenarios.push({
        label: "Sucesso",
        statusCode,
      });
    }

    return scenarios;
  }

  // Cenários de falha de validação
  if (statusCode === "400" || statusCode === "422") {
    const mandatoryParamsKeys =
      Object.keys(mandatoryParamsMap);

    if (mandatoryParamsKeys.length > 0) {
      for (const param of mandatoryParamsKeys) {
        const displayParam =
          param === "__requestBody__"
            ? "Payload Inteiro (Body)"
            : param;

        scenarios.push({
          label: "Falha de Validação",
          statusCode,
          omittedParam: displayParam,
        });
      }
    } else {
      scenarios.push({
        label: "Falha (Bad Request)",
        statusCode,
        omittedParam:
          "Nenhum parâmetro mapeado",
      });
    }

    return scenarios;
  }

  // Fallback para outros erros
  scenarios.push({
    label: "Falha",
    statusCode,
  });

  return scenarios;
}

export function generateTestCases(
  api: any,
  methodConfigs: Map<string, MethodConfig>,
  userEmail: string
): GeneratedTestCase[] {
  const results: GeneratedTestCase[] = [];

  if (!api?.paths) {
    return results;
  }

  for (const [path, methods] of Object.entries(
    api.paths
  )) {
    const pathData = methods as PathItem;

    for (const [method, details] of Object.entries(
      pathData
    )) {
      // Ignora propriedades que não são métodos HTTP
      if (
        [
          "parameters",
          "summary",
          "description",
          "servers",
          "$ref",
        ].includes(method)
      ) {
        continue;
      }

      // Proteção contra valores inválidos
      if (
        typeof details !== "object" ||
        details === null
      ) {
        continue;
      }

      const configKey = `${method.toUpperCase()}:${path}`;

      const methodConfig =
        methodConfigs.get(configKey);

      if (!methodConfig) {
        continue;
      }

      const operation = details as Operation;

      const endpointDesc =
        operation.description ||
        operation.summary ||
        "";

      const responses = operation.responses || {};

      const sortedStatusCodes =
        Object.keys(responses).sort();

      // Extração dos parâmetros obrigatórios
      const mandatoryParamsMap = extractParams(
        path,
        method,
        pathData
      );

      for (const statusCode of sortedStatusCodes) {
        const scenarios =
          buildScenariosForStatus(
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
            mandatoryParams:
              mandatoryParamsMap,
          });
        }
      }
    }
  }

  return results;
}