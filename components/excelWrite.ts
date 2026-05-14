import ExcelJS from "exceljs";

import { HEADERS } from "./types.ts";

import { generateStepData } from "./stepBuilder.ts";

import type {
  RowData,
  GeneratedTestCase,
} from "./types.ts";

const OUTPUT_FILE =
  "./Caderno_Casos_de_Testes.xlsx";

function createEmptyRow(): RowData {
  return HEADERS.reduce((acc, curr) => {
    acc[curr] = "";

    return acc;
  }, {} as RowData);
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
  testCases: GeneratedTestCase[]
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
      mandatoryParams,
    } = tc;

const data = generateStepData(
  scenario.statusCode.toString(),
  methodConfig.url,
  ctFormatado,
  tcSequence++,
  methodConfig.summary,
  scenario.omittedParam,
  scenario.exampleKey,
  methodConfig.method,
  methodConfig.requestBody,
  methodConfig.successResponse
);

    const parentRow = createEmptyRow();

    parentRow.unique_id =
      (globalId++).toString();

    parentRow.type = "test_manual";

    parentRow.name = data.testName;

    parentRow.test_type = "API";

    parentRow.designer = userEmail;

    parentRow.description = endpointDesc;

    parentRow.owner = userEmail;

    parentRow.phase = "New";

const schemaName =
  methodConfig.requestBody
    ?.__schemaName || "Request";

parentRow.user_tags = `${ctFormatado};${methodConfig.method.toUpperCase()} ${schemaName}`;


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

    const valRow = createEmptyRow();

    valRow.unique_id =
      (globalId++).toString();

    valRow.type = "step";

    valRow.step_type = "Validation";

    valRow.step_description =
      data.expectedResult;

    worksheet.addRow(valRow);
  }

  try {
    await workbook.xlsx.writeFile(
      OUTPUT_FILE
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