import {
  extractAllParams,
  extractParams,
} from "./paramExtractor.ts";
import {
  buildExampleFromSchema,
  extractResponseExamples,
} from "./swaggerExtractor.ts";
import type {
  TestScenario,
  MethodConfig,
  GeneratedTestCase,
  Operation,
  PathItem,
  MandatoryParam,
} from "./types.ts";

function getExampleValue(example: any): any {
  if (
    example &&
    typeof example === "object" &&
    "value" in example
  ) {
    return example.value;
  }

  return example;
}

function extractRequestExamples(
  api: any,
  endpointDetails: Operation
): Pick<
  TestScenario,
  "exampleKey" | "requestBody"
>[] {
  const content =
    endpointDetails.requestBody?.content?.[
      "application/json"
    ];

  if (!content) {
    return [{}];
  }

  if ("example" in content) {
    return [
      {
        requestBody: content.example,
      },
    ];
  }

  if (content.examples) {
    return Object.entries(
      content.examples
    ).map(([exampleKey, example]) => ({
      exampleKey,
      requestBody: getExampleValue(example),
    }));
  }

  if (content.schema?.example) {
    return [
      {
        requestBody: content.schema.example,
      },
    ];
  }

  if (content.schema) {
    return [
      {
        requestBody: buildExampleFromSchema(
          api,
          content.schema
        ),
      },
    ];
  }

  return [{}];
}

function parseParamValue(value: string): any {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    /^(true|false|null)$/i.test(trimmed) ||
    /^-?\d+(\.\d+)?$/.test(trimmed) ||
    /^[\[{"]/.test(trimmed)
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function cloneRequestBody(value: any): any {
  if (value === undefined || value === null) {
    return {};
  }

  return JSON.parse(JSON.stringify(value));
}

function setBodyValue(
  target: any,
  path: string,
  value: any
): void {
  const parts = path
    .split(".")
    .filter(Boolean);

  let current = target;

  parts.forEach((rawPart, index) => {
    const isArray = rawPart.endsWith("[]");
    const part = isArray
      ? rawPart.slice(0, -2)
      : rawPart;
    const isLast = index === parts.length - 1;

    if (isArray) {
      if (!Array.isArray(current[part])) {
        current[part] = [{}];
      }

      if (!current[part][0] || typeof current[part][0] !== "object") {
        current[part][0] = {};
      }

      if (isLast) {
        current[part][0] = value;
      } else {
        current = current[part][0];
      }

      return;
    }

    if (isLast) {
      current[part] = value;
      return;
    }

    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }

    current = current[part];
  });
}

function applyBodyParamValues(
  requestBody: any,
  paramValues: Record<string, string> = {},
  paramsMap: Record<string, MandatoryParam> = {}
): any {
  const body = cloneRequestBody(requestBody);

  for (const [name, value] of Object.entries(paramValues)) {
    if (!value.trim()) {
      continue;
    }

    const param = paramsMap[name];

    if (!param || param.in !== "body") {
      continue;
    }

    setBodyValue(
      body,
      name,
      parseParamValue(value)
    );
  }

  return body;
}

function buildScenariosForStatus(
  api: any,
  statusCode: string,
  endpointDetails: Operation,
  responseDetails: any,
  validationParamsMap: Record<string, any>,
  selectedParams?: string[],
  paramValues: Record<string, string> = {}
): TestScenario[] {
  const scenarios: TestScenario[] = [];
  const responseExamples =
    extractResponseExamples(
      api,
      responseDetails,
      statusCode
    );

  // Cenários de sucesso (2XX)
  if (statusCode.startsWith("2")) {
    const requestExamples =
      extractRequestExamples(
        api,
        endpointDetails
      );

    for (const requestExample of requestExamples) {
      for (const responseExample of responseExamples) {
        const exampleKey =
          responseExample.exampleKey ||
          requestExample.exampleKey;

        const scenario: TestScenario = {
          label: "Sucesso",
          statusCode,
          ...responseExample,
        };

        if (exampleKey) {
          scenario.exampleKey = exampleKey;
        }

        if (requestExample.requestBody !== undefined) {
          scenario.requestBody =
            applyBodyParamValues(
              requestExample.requestBody,
              paramValues,
              validationParamsMap
            );
        }

        scenarios.push(scenario);
      }
    }

    return scenarios;
  }

  // Cenários de falha de validação (400/422)
  if (statusCode === "400" || statusCode === "422") {
    const mandatoryParamsKeys =
      selectedParams?.length
        ? selectedParams.filter(
            (param) => validationParamsMap[param]
          )
        : Object.keys(validationParamsMap);

    if (mandatoryParamsKeys.length > 0) {
      for (const param of mandatoryParamsKeys) {
        const displayParam =
          param === "__requestBody__" ? "Payload Inteiro (Body)" : param;

        for (const responseExample of responseExamples) {
          scenarios.push({
            label: "Falha de Validação",
            statusCode,
            omittedParam: displayParam,
            ...responseExample,
          });
        }
      }
    } else {
      for (const responseExample of responseExamples) {
        scenarios.push({
          label: "Falha (Bad Request)",
          statusCode,
          omittedParam: "Nenhum parâmetro mapeado",
          ...responseExample,
        });
      }
    }

    return scenarios;
  }

  for (const responseExample of responseExamples) {
    scenarios.push({
      label: "Falha",
      statusCode,
      ...responseExample,
    });
  }

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
      const operationTitle =
        methodConfig.operationTitle ||
        operation.summary ||
        operation.operationId ||
        path.split("/").filter(Boolean).pop() ||
        "Request";
      const endpointDesc = operation.description || operation.summary || "";
      const responses = operation.responses || {};
      const selectedStatusCodes =
        methodConfig.statusCodes?.map(String);

      const sortedStatusCodes = Object.keys(responses)
        .filter(
          (statusCode) =>
            !selectedStatusCodes?.length ||
            selectedStatusCodes.includes(statusCode)
        )
        .sort();

      // Agora o extractParams já traz os campos com '*'
      const mandatoryParamsMap = extractParams(
        api,
        path,
        method,
        pathData
      );

      const validationParamsMap =
        extractAllParams(
          api,
          path,
          method,
          pathData
        );

      for (const statusCode of sortedStatusCodes) {
        const scenarios = buildScenariosForStatus(
          api,
          statusCode,
          operation,
          responses[statusCode],
          validationParamsMap,
          methodConfig.mandatoryParams,
          methodConfig.paramValues
        );

        for (const scenario of scenarios) {
          results.push({
            ctFormatado: methodConfig.summary,
            scenario,
            methodConfig: {
              ...methodConfig,
              operationTitle,
            },
            endpointDesc,
            userEmail,
            mandatoryParams: mandatoryParamsMap,
          });
        }
      }

      for (const extraScenario of methodConfig.extraScenarios || []) {
        const extraDescription =
          extraScenario.description || "";
        const extraStepDescription =
          extraScenario.stepDescription || "";

        if (
          !extraDescription.trim() &&
          !extraStepDescription.trim()
        ) {
          continue;
        }

        results.push({
          ctFormatado: methodConfig.summary,
          scenario: {
            label: "Manual",
            statusCode: "MANUAL",
            manualDescription:
              extraDescription,
            manualStepDescription:
              extraStepDescription,
          },
          methodConfig: {
            ...methodConfig,
            operationTitle,
          },
          endpointDesc,
          userEmail,
          mandatoryParams: mandatoryParamsMap,
        });
      }
    }
  }

  return results;
}
