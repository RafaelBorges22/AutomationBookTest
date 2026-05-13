import type {
  PathItem,
  Parameter,
  Operation,
  MandatoryParam,
  TestScenario,
  MethodConfig,
  GeneratedTestCase,
} from "./types.ts";

/**
 * Retorna apenas os parâmetros obrigatórios.
 */
export function extractParamRequired(
  parameters: Parameter[] = []
): Parameter[] {
  return parameters.filter(
    (param) => param.required
  );
}

/**
 * Extrai regras de negócio da descrição.
 */
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

/**
 * Extrai parâmetros obrigatórios do endpoint.
 */
export function extractParams(
  path: string,
  method: string,
  pathData: PathItem
): Record<string, MandatoryParam> {
  const mandatoryParams: Record<
    string,
    MandatoryParam
  > = {};

  const operation =
    pathData[
      method.toLowerCase() as keyof PathItem
    ] as Operation;

  if (!operation) {
    return mandatoryParams;
  }

  const allParams: Parameter[] = [
    ...(pathData.parameters || []),
    ...(operation.parameters || []),
  ];

  const requiredParams =
    extractParamRequired(allParams);

  for (const param of requiredParams) {
    mandatoryParams[param.name] = {
      name: param.name,
      in: param.in,
      required: true,
    };
  }

  // OpenAPI 3 - Request Body obrigatório
  if (operation.requestBody?.required) {
    mandatoryParams["__requestBody__"] = {
      name: "__requestBody__",
      in: "body",
      required: true,
    };
  }

  return mandatoryParams;
}

/**
 * Monta cenários por status code.
 */
function buildScenariosForStatus(
  statusCode: string,
  endpointDetails: Operation,
  mandatoryParamsKeys: string[]
): TestScenario[] {
  const scenarios: TestScenario[] = [];

  // Sucesso
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

  // Falha de validação
  if (statusCode === "400" || statusCode === "422") {
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
          "Nenhum parametro mapeado",
      });
    }

    return scenarios;
  }

  // Outros erros
  scenarios.push({
    label: "Falha",
    statusCode,
  });

  return scenarios;
}

/**
 * Geração principal dos casos de teste.
 */
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
      // Ignora propriedades inválidas
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

      const mandatoryParamsMap = extractParams(
        path,
        method,
        pathData
      );

      const mandatoryParamsKeys =
        Object.keys(mandatoryParamsMap);

      for (const statusCode of sortedStatusCodes) {
        const scenarios =
          buildScenariosForStatus(
            statusCode,
            operation,
            mandatoryParamsKeys
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