import type {
  StepData,
  TestScenario,
} from "./types.ts";

const formatJson = (obj: any): string =>
  JSON.stringify(obj, null, 2);

const STATUS_TITLES: Record<string, string> = {
  "400": "Bad Request",
  "401": "Unauthorized",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "415": "Unsupported Media Type",
  "422": "Unprocessable Entity",
  "429": "Too Many Requests",
  "500": "Internal Server Error",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
};

function getStatusTitle(
  statusCode: string
): string {
  return STATUS_TITLES[statusCode] || "Falha";
}

function formatParamValues(
  paramValues: Record<string, string> = {}
): string {
  const entries = Object.entries(paramValues)
    .filter(([, value]) => value.trim())
    .map(([name, value]) => `${name}: ${value}`);

  if (!entries.length) {
    return "";
  }

  return `\n\nMASSA DE DADOS:\n${entries.join("\n")}`;
}

function normalizeStatusCode(value: unknown): string {
  return String(value ?? "").trim();
}

export function generateStepData(
  scenario: TestScenario,
  methodUrl: string,
  ctBase: string,
  index: number,
  methodSummary: string,
  method?: string,
  requestBody?: any,
  paramValues?: Record<string, string>
): StepData {
  if (
    scenario.manualDescription !== undefined ||
    scenario.manualStepDescription !== undefined
  ) {
    return {
      description: scenario.manualStepDescription || "",
      expectedResult: "",
      testName: `${ctBase}.${index
        .toString()
        .padStart(4, "0")} - Cenário extra - ${methodSummary}`,
    };
  }

  const statusCode = normalizeStatusCode(
    scenario.statusCode
  );

  const exampleSuffix =
    scenario.exampleKey
      ? ` - EX ${scenario.exampleKey}`
      : "";

  const responseBody =
    scenario.responseBody ?? {};

  const requestPayload =
    scenario.requestBody ??
    requestBody ??
    {};

  const sequence = index
    .toString()
    .padStart(4, "0");

  const fullCtId = `${ctBase}.${sequence}`;

  const isSuccess =
    statusCode.startsWith("2");
  const paramsDescription =
    formatParamValues(paramValues);

  let description = "";

  let expectedResult = "";

  let testName = "";

  // =========================
  // SUCESSO
  // =========================
  if (isSuccess) {
    testName = `${fullCtId} - Request aceita para processamento - Sucesso - COD ${statusCode}${exampleSuffix}`;

    if (method?.toUpperCase() === "GET") {
      description = `1 - Executar a API via URL: ${methodUrl}
${paramsDescription}

2 - Enviar requisição.`;
    } else if (
      ["POST", "PUT", "PATCH"].includes(
        method?.toUpperCase() || ""
      )
    ) {
      description = `1 - Executar a API via URL: ${methodUrl}

2 - Passar o payload: ${formatJson(requestPayload)}
${paramsDescription}

3 - Enviar requisição.`;
    } else {
      description = `1 - Executar a API via URL: ${methodUrl}
${paramsDescription}

2 - Enviar requisição.`;
    }

    expectedResult = `1 - Envio apresenta sucesso com status ${statusCode}

2 - Response retorna os seguintes valores:

Response COD ${statusCode}:
${formatJson(responseBody)}`;

    return {
      description,
      expectedResult,
      testName,
    };
  }

  // =========================
  // BAD REQUEST
  // =========================
  if (statusCode === "400" || statusCode === "422") {
    const paramName =
      scenario.omittedParam ||
      "Parâmetro";
    const statusTitle =
      getStatusTitle(statusCode);

    testName = `${fullCtId} - Request enviada com falha - ${statusTitle} - [${paramName}] - COD ${statusCode}${exampleSuffix}`;

    description = `1 - Para validação do request, execute a API com o seguinte parâmetro omitido:

"**${paramName}**": ""

2 - URL: ${methodUrl}`;

    expectedResult = `1 - Envio apresenta falha com status ${statusCode}

2 - Response retorna os seguintes valores:

Response COD ${statusCode}:
${formatJson(responseBody)}`;

    return {
      description,
      expectedResult,
      testName,
    };
  }

// =========================
// DEMAIS ERROS
// =========================
const statusTitle =
  getStatusTitle(statusCode);

testName = `${fullCtId} - Request enviada com falha - ${statusTitle} - COD ${statusCode}${exampleSuffix}`;

let invalidParamDescription = "";

switch (statusCode) {
  case "401":
    invalidParamDescription = `Header: Authorization: "Bearer token_invalido"`;
    break;

  case "403":
    invalidParamDescription = `Header: Authorization: "BASIC NPER"`;
    break;

  case "404":
    invalidParamDescription = `URL com recurso inexistente`;
    break;

  case "405":
    invalidParamDescription = `Method: DELETE`;
    break;

  case "406":
    invalidParamDescription = `Accept: text/plain`;
    break;

  case "415":
    invalidParamDescription = `Content-Type: text/plain`;
    break;

  case "429":
    invalidParamDescription = `Múltiplas requisições simultâneas`;
    break;

  case "500":
    invalidParamDescription = `Falha interna no servidor`;
    break;

  case "502":
    invalidParamDescription = `Gateway inválido`;
    break;

  case "503":
    invalidParamDescription = `Serviço indisponível`;
    break;

  case "504":
    invalidParamDescription = `Timeout na integração`;
    break;

  default:
    invalidParamDescription = `Parâmetro inválido`;
    break;
}

description = `1 - Para validação do request, execute a API com os seguinte parâmetro inválido:

${invalidParamDescription}

2 - Executar a API via URL: ${methodUrl}

3 - Enviar requisição.`;

expectedResult = `1 - Envio apresenta falha com status ${statusCode}

2 - Response COD ${statusCode}:

${formatJson(responseBody)}`;

  return {
    description,
    expectedResult,
    testName,
  };
}
