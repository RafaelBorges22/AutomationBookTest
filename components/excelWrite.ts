import ExcelJS from "exceljs";

import { HEADERS } from "./types.ts";

import { generateStepData } from "./stepBuilder.ts";

import type {
  RowData,
  GeneratedTestCase,
} from "./types.ts";

const DEFAULT_OUTPUT_FILE =
  "./Caderno_Casos_de_Testes.xlsx";

const CORRUPTED_STATUS_PATTERNS = [
  /\bstatus\s+0\b/i,
  /\bCOD\s+S?0\b/i,
];

function createEmptyRow(): RowData {
  return HEADERS.reduce((acc, curr) => {
    acc[curr] = "";

    return acc;
  }, {} as RowData);
}

function buildFeatureCode(ctBase: string): string {
  if (/^CF\d+/i.test(ctBase)) {
    return ctBase.toUpperCase();
  }

  const match = ctBase.match(/\d+/g);
  const sequence = match?.[match.length - 1];

  return sequence
    ? `CF${sequence.padStart(3, "0")}`
    : ctBase;
}

function buildPrerequisite(
  statusCode: string,
  omittedParam?: string
): string {
  if (statusCode === "MANUAL") {
    return "";
  }

  if (statusCode.startsWith("2")) {
    return "Request Body/Header valido com todos os parâmetros obrigatórios.";
  }

  if (statusCode === "400" || statusCode === "422") {
    return omittedParam
      ? `Parâmetro obrigatório omitido: ${omittedParam}`
      : "Parâmetro obrigatório omitido.";
  }

  const prerequisites: Record<string, string> = {
    "401": 'Header: Authorization: ""',
    "403": 'Header: Authorization: "BASIC NPER"',
    "404": "URL com recurso inexistente",
    "405": "Method: DELETE",
    "406": "accept: text/plain",
    "415": "Content-Type: text/plain",
    "429": 'Header: Authorization: "BASIC NQ"',
    "500": "Falha interna no servidor",
    "502": "Gateway inválido",
    "503": "Serviço indisponível",
    "504": "Timeout na integração",
  };

  return prerequisites[statusCode] || "Parâmetro inválido";
}

function cleanOperationTitle(
  operationTitle?: string
): string {
  return (operationTitle || "Request")
    .replace(/\s+/g, " ")
    .replace(/[.;:,]+$/g, "")
    .trim();
}

function styleHeaderRow(
  worksheet: ExcelJS.Worksheet
): void {
  const headerRow = worksheet.getRow(1);

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF203864" },
    };

    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
    };
  });

  headerRow.height = 25;
}

function setColumnWidths(
  worksheet: ExcelJS.Worksheet
): void {
  const widths: Record<string, number> = {
    unique_id: 10,
    type: 15,
    name: 60,
    step_description: 80,
    description: 40,
    user_tags: 30,
  };

  worksheet.columns = HEADERS.map((header) => ({
    header,
    key: header,
    width: widths[header] ?? 18,
    style: {
      alignment: {
        wrapText: true,
        vertical: "top",
        horizontal: "left",
      },
    },
  }));
}

export async function writeExcel(
  testCases: GeneratedTestCase[],
  outputFile = DEFAULT_OUTPUT_FILE
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet(
    "Test Cases",
    {
      views: [{ state: "frozen", ySplit: 1 }],
    }
  );

  setColumnWidths(worksheet);

  styleHeaderRow(worksheet);

  let globalId = 1;

  let tcSequence = 1;

  for (const tc of testCases) {
    const {
      ctFormatado,
      scenario,
      methodConfig,
      endpointDesc,
      userEmail,
    } = tc;

const data = generateStepData(
  scenario,
  methodConfig.url,
  ctFormatado,
  tcSequence++,
  methodConfig.operationTitle ||
    methodConfig.summary,
  methodConfig.method,
  methodConfig.requestBody,
  methodConfig.paramValues
);

    const parentRow = createEmptyRow();

    parentRow.unique_id =
      (globalId++).toString();

    parentRow.type = "test_manual";

    parentRow.name = data.testName;

    parentRow.test_type = "API";

    parentRow.designer = userEmail;

    parentRow.description =
      scenario.manualDescription ??
      `URL: [${methodConfig.method.toUpperCase()}] ${methodConfig.url}\n\nDescrição: ${endpointDesc}`;

    parentRow.prerequisite_udf =
      buildPrerequisite(
        scenario.statusCode.toString(),
        scenario.omittedParam
      );

    parentRow.owner = userEmail;

    parentRow.phase = "New";

  const operationTitle =
  cleanOperationTitle(
    methodConfig.operationTitle
  );

parentRow.user_tags = `${buildFeatureCode(ctFormatado)}; ${methodConfig.method.toUpperCase()} ${operationTitle}`;


    parentRow.responsible_factory_udf =
      "HITSS";

    parentRow.test_phase_udf =
      "Testes Integrados";

    worksheet.addRow(parentRow);

    const stepRow = createEmptyRow();

    stepRow.unique_id =
      (globalId++).toString();

    stepRow.type = "step";

    stepRow.step_type = "simple";

    stepRow.step_description =
      data.description;

    worksheet.addRow(stepRow);

    if (!data.expectedResult.trim()) {
      continue;
    }

    const valRow = createEmptyRow();

    valRow.unique_id =
      (globalId++).toString();

    valRow.type = "step";

    valRow.step_type = "Validation";

    valRow.step_description =
      data.expectedResult;

    worksheet.addRow(valRow);
  }

  assertNoCorruptedStatusText(worksheet);

  try {
    await workbook.xlsx.writeFile(
      outputFile
    );

    console.log(
      `\n✔ Arquivo gerado com sucesso: ${testCases.length} casos de teste documentados.`
    );
  } catch (e) {
    console.error(
      "❌ Erro crítico ao salvar o Excel:",
      e
    );
  }
}

function assertNoCorruptedStatusText(
  worksheet: ExcelJS.Worksheet
): void {
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, columnNumber) => {
      const value = cell.value;

      if (typeof value !== "string") {
        return;
      }

      const hasCorruptedStatus =
        CORRUPTED_STATUS_PATTERNS.some(
          (pattern) => pattern.test(value)
        );

      if (!hasCorruptedStatus) {
        return;
      }

      throw new Error(
        `Status code corrompido detectado na linha ${rowNumber}, coluna ${columnNumber}. ` +
          "A geração foi interrompida para evitar exportar CT com 200 mutilado por replace global."
      );
    });
  });
}
