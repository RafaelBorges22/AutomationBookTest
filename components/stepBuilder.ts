import type { MandatoryParam } from "./types.ts";

type StepData = {
  description: string;
  expectedResult: string;
  testName: string;
};

const formatJson = (obj: any) => JSON.stringify(obj, null, 2);

const getErrorJson = (code: string) => JSON.stringify({
  apiVersion: "1;2025-09-03",
  transactionId: "Id-12312414231",
  error: {
    httpCode: code,
    errorCode: `TMF622-00${code === '400' ? '37' : '01'}`,
    message: "Request is not valid.",
    detailedMessage: "Request Inválido.",
    link: { rel: "related", href: "https://api.claro.com.br" }
  }
}, null, 2);

export function generateStepData(
  statusCode: string,
  methodUrl: string,
  ctBase: string, // Ex: API-CT-024
  index: number,  // O contador (1, 2, 3...)
  methodSummary: string,
  omittedParam?: MandatoryParam,
  exampleKey?: string
): StepData {
  
  // Formata o ID com 4 dígitos (ex: 0001)
  const sequence = index.toString().padStart(4, '0');
  const fullCtId = `${ctBase}.${sequence}`;
  
  let description = "";
  let expectedResult = "";
  let testName = "";

  if (statusCode.startsWith("2")) {
    testName = `${fullCtId} - Request aceita para processamento - ${methodSummary} - COD ${statusCode}`;
    description = `1 - Executar a API via URL: ${methodUrl}\n2 - Passar o payload: ${exampleKey || "Padrão"}\n3 - Enviar requisição.`;
    expectedResult = `1 - Envio apresenta sucesso com status ${statusCode}\n2 - O response deve apresentar os dados conforme contrato.`;
  } 
  else if (statusCode === "400") {
    const paramName = omittedParam?.name || "Parâmetro";
    testName = `${fullCtId} - Request enviada com falha - Bad Request - [${paramName}] - COD 400`;
    description = `1 - Para validação do request, execute a API com o seguinte parâmetro omitido:\n\n"**${paramName}**": ""\n\n2 - URL: ${methodUrl}`;
    expectedResult = `1 - Envio apresenta falha com status 400\n\n2 - Response retorna os seguintes valores:\n\nResponse COD 400:\n${getErrorJson("400")}`;
  }
  else {
    // Fallback para outros erros (401, 404, etc)
    testName = `${fullCtId} - Request enviada com falha - ${methodSummary} - COD ${statusCode}`;
    description = `1 - Executar a API via URL: ${methodUrl}\n2 - Forçar cenário de erro ${statusCode}`;
    expectedResult = `1 - Envio apresenta falha com status ${statusCode}\n\n2 - Response COD ${statusCode}:\n${getErrorJson(statusCode)}`;
  }

  return { description, expectedResult, testName };
}