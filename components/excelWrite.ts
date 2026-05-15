import ExcelJS from "exceljs";
import { HEADERS } from "./types.ts";
import { generateStepData } from "./stepBuilder.ts";
import type { RowData, GeneratedTestCase } from "./types.ts";

const OUTPUT_FILE = "./Caderno_Casos_de_Testes.xlsx";

/**
 * Cria um objeto de linha vazio baseado nos HEADERS definidos no types.ts
 */
function createEmptyRow(): RowData {
  return HEADERS.reduce((acc, curr) => {
    acc[curr] = "";
    return acc;
  }, {} as RowData);
}

/**
 * Estilização do cabeçalho da planilha
 */
function styleHeaderRow(worksheet: ExcelJS.Worksheet): void {
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

/**
 * Define larguras padrão para as colunas principais
 */
function setColumnWidths(worksheet: ExcelJS.Worksheet): void {
  const widths: Record<string, number> = {
    unique_id: 10,
    type: 15,
    name: 60,
    step_description: 80,
    product_areas: 25,
    designer: 25,
    description: 40,
  };

  worksheet.columns = HEADERS.map((header) => ({
    header: header,
    key: header, // ESSA LINHA É CRUCIAL
    width: widths[header] || 20,
  }));

  HEADERS.forEach((header, index) => {
    worksheet.getColumn(index + 1).width = widths[header] || 20;
  });
}

export async function writeTestCasesToExcel(testCases: GeneratedTestCase[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Test Cases");

  // Configura os cabeçalhos
  worksheet.addRow(HEADERS);
  setColumnWidths(worksheet);
  styleHeaderRow(worksheet);

  let globalId = 1;
  
  // Mapa para controlar a numeração incremental (0001, 0002...) por ID Base
  const counterMap = new Map<string, number>();

  for (const data of testCases) {
    const { 
      ctFormatado, 
      scenario, 
      methodConfig, 
      endpointDesc, 
      userEmail, 
      productAreas 
    } = data;

    // Incrementa o contador para o CT Base atual
    const currentCount = (counterMap.get(ctFormatado) || 0) + 1;
    counterMap.set(ctFormatado, currentCount);

    // Gera os dados de Step usando o index incremental
    const stepData = generateStepData(
      scenario.statusCode,
      methodConfig.url,
      ctFormatado,
      currentCount, // <-- Número incremental corrigido
      methodConfig.summary,
      scenario.omittedParam,
      scenario.exampleKey,
      methodConfig.method,
      methodConfig.requestBody,
      methodConfig.successResponse
    );

    // --- 1. LINHA PAI (test_manual) ---
    const parentRow = createEmptyRow();
    parentRow.unique_id = (globalId++).toString();
    parentRow.type = "test_manual";
    parentRow.name = stepData.testName;
    parentRow.test_type = "API";
    parentRow.product_areas = productAreas;
    parentRow.covered_content = "API";
    parentRow.designer = userEmail;
    parentRow.description = endpointDesc;
    parentRow.owner = userEmail;
    parentRow.phase = "New";
    parentRow.estimated_duration = 1;

    // Lógica de Prerequisito
if (scenario.statusCode.startsWith("2")) {
  parentRow.prerequisite_udf = "Request Body/Header valido com todos os parâmetros obrigatórios:";
} 
else if (scenario.statusCode === "400" || scenario.statusCode === "422") {
  const param = scenario.omittedParam || "N/A";
  const displayParam = param === "__requestBody__" ? "Payload Inteiro (Body)" : param;
  parentRow.prerequisite_udf = `Request Body/Header valido com seguinte parametro obrigatório omitido: [${displayParam}]`;
} 
else {
  const param = scenario.omittedParam || "N/A";
  const displayParam = param === "__requestBody__" ? "Payload Inteiro (Body)" : param;
  parentRow.prerequisite_udf = `Request Body/Header valido com seguinte parametro obrigatório invalido:[${displayParam}]`;
}

    const schemaName = methodConfig.requestBody?.__schemaName || "Request";
    parentRow.user_tags = `${ctFormatado};${methodConfig.method.toUpperCase()} ${schemaName}`;
    parentRow.responsible_factory_udf = "HITSS";
    parentRow.test_phase_udf = "Testes Integrados";

    worksheet.addRow(parentRow);

    // --- 2. LINHA DE STEP (Ação) ---
    const stepRow = createEmptyRow();
    stepRow.unique_id = (globalId++).toString();
    stepRow.type = "step";
    stepRow.step_type = "simple";
    stepRow.step_description = stepData.description;
    worksheet.addRow(stepRow);

    // --- 3. LINHA DE VALIDAÇÃO (Resultado Esperado) ---
    const valRow = createEmptyRow();
    valRow.unique_id = (globalId++).toString();
    valRow.type = "step";
    valRow.step_type = "Validation";
    valRow.step_description = stepData.expectedResult;
    worksheet.addRow(valRow);
  }

  // Ajuste final de alinhamento para leitura
worksheet.eachRow((row) => {
    // Em vez de usar o nome da coluna, usamos o index ou verificamos se a key existe
    const stepCell = row.getCell('step_description');
    const nameCell = row.getCell('name');

    if (stepCell) {
      stepCell.alignment = { wrapText: true, vertical: "top" };
    }
    if (nameCell) {
      nameCell.alignment = { wrapText: true, vertical: "top" };
    }
  });

  await workbook.xlsx.writeFile(OUTPUT_FILE);
  console.log(`\n✔ Arquivo criado com sucesso: ${OUTPUT_FILE}`);
}