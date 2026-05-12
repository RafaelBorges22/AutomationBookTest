import { getMandatoryParameters } from "./paramExtractor.js";
import type { TestScenario, MethodConfig, GeneratedTestCase } from "./types.ts";

function extractBusinessRules(description: string): string[] {
  if (!description) return ["Falha de validação genérica"];

  const bulletLines = description
    .split("\n")
    .filter((line) => line.trim().startsWith("*") || line.trim().startsWith("-"));

  if (bulletLines.length > 0) {
    return bulletLines.map((rule) => rule.replace(/^[*\-]\s*/, "").trim());
  }

  return [description.split("\n")[0] ?? "Falha de validação genérica"];
}

function buildScenariosForStatus(
  statusCode: string,
  responseDetails: any,
  endpointDetails: any
): TestScenario[] {
  const scenarios: TestScenario[] = [];

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

  if (statusCode === "400") {
    const mandatoryParams = getMandatoryParameters(endpointDetails);
    for (const param of mandatoryParams) {
      scenarios.push({ label: "Falha", statusCode, omittedParam: param });
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

  for (const [path, methods] of Object.entries(api.paths)) {
    for (const [method, details] of Object.entries(methods as Record<string, any>)) {
      const configKey = `${method.toUpperCase()}:${path}`;
      const methodConfig = methodConfigs.get(configKey);
      if (!methodConfig) continue;

      const endpointDesc = details.description || details.summary || "";
      const responses = details.responses || {};
      const sortedStatusCodes = Object.keys(responses).sort();

      for (const statusCode of sortedStatusCodes) {
        const scenarios = buildScenariosForStatus(statusCode, responses[statusCode], details);
        for (const scenario of scenarios) {
          results.push({
            // Passamos apenas o prefixo (ex: API-CT-024) que veio do CLI
            ctFormatado: methodConfig.summary, 
            scenario,
            methodConfig,
            endpointDesc,
            userEmail,
          });
        }
      }
    }
  }
  return results;
}