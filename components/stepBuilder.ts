import type {
  MandatoryParam,
  StepData,
} from "./types.ts";

import { MOCK_ERROR_RESPONSES } from "./mockResponse.ts";

const formatJson = (obj: any): string =>
  JSON.stringify(obj, null, 2);

export function generateStepData(
  statusCode: string,
  methodUrl: string,
  ctBase: string,
  index: number,
  methodSummary: string,
  omittedParam?: MandatoryParam | string,
  exampleKey?: string,
  method?: string,
  requestBody?: any,
  successResponse?: any
): StepData {
  const sequence = index
    .toString()
    .padStart(4, "0");

  const fullCtId = `${ctBase}.${sequence}`;

  const isSuccess =
    statusCode.startsWith("2");

  let description = "";

  let expectedResult = "";

  let testName = "";

  // =========================
  // SUCESSO
  // =========================
  if (isSuccess) {
    testName = `${fullCtId} - Request enviada com sucesso - ${methodSummary} - COD ${statusCode}`;

    if (method?.toUpperCase() === "GET") {
      description = `1 - Para validação do request, execute a API com os seguintes parâmetros:

HEADER:
Accept: application/json

2 - O response retornado deve apresentar o seguinte valor:

APIGEE = ${statusCode}`;
    } else if (
      ["POST", "PUT", "PATCH"].includes(
        method?.toUpperCase() || ""
      )
    ) {
      description = `1 - Para validação da request execute a API com os seguintes parâmetros:

REQUEST BODY:
${formatJson(requestBody || {})}

2 - O response retornado deve apresentar o seguinte valor:

APIGEE = ${statusCode}`;
    } else {
      description = `1 - Executar a API via URL:

${methodUrl}

2 - Validar retorno de sucesso:

APIGEE = ${statusCode}`;
    }

    expectedResult = `1 - Envio apresenta sucesso com status ${statusCode}

2 - Response body:
${formatJson(successResponse || {})}`;

    return {
      description,
      expectedResult,
      testName,
    };
  }

  // =========================
  // BAD REQUEST
  // =========================
  if (statusCode === "400") {
    const paramName =
      typeof omittedParam === "string"
        ? omittedParam
        : omittedParam?.name ||
          "Parâmetro";

    testName = `${fullCtId} - Request enviada com falha - Bad Request - [${paramName}] - COD 400`;

    description = `1 - Para validação do request, execute a API com o seguinte parâmetro omitido:

"${paramName}": ""

2 - URL:${methodUrl}`;

    expectedResult = `1 - Envio apresenta falha com status 400

2 - Response retorna os seguintes valores:

Response COD 400:
${formatJson(
  MOCK_ERROR_RESPONSES["400"]
)}`;

    return {
      description,
      expectedResult,
      testName,
    };
  }

// =========================
// DEMAIS ERROS
// =========================
testName = `${fullCtId} - Request enviada com falha - ${methodSummary} - COD ${statusCode}`;

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

2 - O response retornado deve apresentar o seguinte valor:

APIGEE = ${statusCode}`;

expectedResult = `1 - Envio apresenta falha com status ${statusCode}

2 - Response COD ${statusCode}:

${formatJson(
  MOCK_ERROR_RESPONSES[
    statusCode
  ] || {
    error: {
      httpCode: statusCode,
      message: "Erro não mapeado.",
    },
  }
)}`;

  return {
    description,
    expectedResult,
    testName,
  };
}