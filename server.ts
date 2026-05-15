// server.ts

import express from "express";
import cors from "cors";
import path from "path";
import * as fs from "node:fs/promises";

import { generateTestCases } from "./components/scenarioGenerator.ts";
import { writeExcel } from "./components/excelWrite.ts";
import {
  extractAllParams,
  extractParams,
} from "./components/paramExtractor.ts";

import type {
  MethodConfig,
  PathItem,
  Operation,
} from "./components/types.ts";

const app = express();

app.use(cors());

app.use(express.json({ limit: "100mb" }));

app.use((error: any, _req: any, res: any, next: any) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error:
        "O arquivo JSON é grande demais para importar. Reduza o arquivo ou use um Swagger menor.",
    });
  }

  if (error instanceof SyntaxError) {
    return res.status(400).json({
      success: false,
      error:
        "A requisição enviada não está em formato JSON válido.",
    });
  }

  return next(error);
});

app.use(express.static("public"));

const IGNORED_PATH_KEYS = [
  "parameters",
  "summary",
  "description",
  "$ref",
  "servers",
];

function sanitizeExcelFileName(
  fileName?: string
): string {
  const fallback =
    "Caderno_Casos_de_Testes.xlsx";

  if (!fileName?.trim()) {
    return fallback;
  }

  const sanitized = fileName
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\.+$/g, "")
    .slice(0, 120);

  if (!sanitized) {
    return fallback;
  }

  return sanitized
    .toLowerCase()
    .endsWith(".xlsx")
    ? sanitized
    : `${sanitized}.xlsx`;
}

function sanitizeJsonFileName(
  fileName?: string
): string {
  const fallback = `swagger-${Date.now()}.json`;

  if (!fileName?.trim()) {
    return fallback;
  }

  const sanitized = path
    .basename(fileName.trim())
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\.+$/g, "")
    .slice(0, 120);

  if (!sanitized) {
    return fallback;
  }

  return sanitized
    .toLowerCase()
    .endsWith(".json")
    ? sanitized
    : `${sanitized}.json`;
}

function normalizeJsonContent(
  content: string | object
): string {
  if (typeof content === "string") {
    return content.replace(/^\uFEFF/, "").trim();
  }

  return JSON.stringify(content, null, 2);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Erro inesperado.";
}

async function readSwaggerJson(
  swaggerPath: string
): Promise<any> {
  let content = "";

  try {
    content = await fs.readFile(
      swaggerPath,
      "utf-8"
    );
  } catch (error) {
    throw new Error(
      `Não foi possível ler o arquivo Swagger: ${getErrorMessage(error)}`
    );
  }

  try {
    return JSON.parse(
      normalizeJsonContent(content)
    );
  } catch (error) {
    throw new Error(
      `O arquivo Swagger não contém um JSON válido: ${getErrorMessage(error)}`
    );
  }
}

function getComplexity(
  requiredParamCount: number
): string {
  if (requiredParamCount > 30) {
    return "Alta complexidade";
  }

  if (requiredParamCount < 15) {
    return "Baixa complexidade";
  }

  return "Media complexidade";
}

function decodeJsonPointerPart(
  part: string
): string {
  return part
    .replace(/~1/g, "/")
    .replace(/~0/g, "~");
}

function resolveSwaggerRef(
  api: any,
  ref?: string
): any {
  if (!ref?.startsWith("#/")) {
    return null;
  }

  let current = api;
  const parts = ref
    .replace(/^#\//, "")
    .split("/")
    .map(decodeJsonPointerPart);

  for (const part of parts) {
    current = current?.[part];

    if (!current) {
      return null;
    }
  }

  return current;
}

function getSwaggerServers(api: any) {
  if (Array.isArray(api?.servers)) {
    return api.servers
      .filter((server: any) =>
        typeof server?.url === "string" &&
        server.url.trim()
      )
      .map((server: any) => ({
        url: server.url.trim(),
        description: server.description || "",
      }));
  }

  if (api?.host) {
    const basePath = api.basePath || "";
    const schemes = Array.isArray(api.schemes) && api.schemes.length
      ? api.schemes
      : ["https"];

    return schemes.map((scheme: string) => ({
      url: `${scheme}://${api.host}${basePath}`,
      description: "",
    }));
  }

  return [];
}

function getResponseMetadata(
  api: any,
  responses: Operation["responses"] = {}
) {
  return Object.entries(responses)
    .map(([statusCode, response]) => {
      const resolvedResponse =
        response?.$ref
          ? resolveSwaggerRef(
              api,
              response.$ref
            ) || response
          : response;
      const jsonContent =
        resolvedResponse?.content?.[
          "application/json"
        ];

      return {
        statusCode,
        description:
          resolvedResponse?.description || "",
        hasBody: Boolean(jsonContent),
        exampleKeys: jsonContent?.examples
          ? Object.keys(jsonContent.examples)
          : [],
      };
    })
    .sort((a, b) =>
      a.statusCode.localeCompare(b.statusCode)
    );
}

app.post("/upload-swagger", async (req, res) => {
  try {
    const { fileName, content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error:
          "Conteúdo do Swagger não informado.",
      });
    }

    const normalizedContent =
      normalizeJsonContent(content);

    try {
      JSON.parse(normalizedContent);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `O arquivo selecionado não contém um JSON válido: ${getErrorMessage(error)}`,
      });
    }

    const savedFileName =
      sanitizeJsonFileName(fileName);

    const documentationPath =
      path.resolve("./documentation");

    const swaggerPath = path.join(
      documentationPath,
      savedFileName
    );

    await fs.mkdir(documentationPath, {
      recursive: true,
    });

    await fs.writeFile(
      swaggerPath,
      normalizedContent,
      "utf-8"
    );

    return res.json({
      success: true,
      swaggerFile: savedFileName,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        `Não foi possível salvar o Swagger. ${getErrorMessage(error)}`,
    });
  }
});

app.post("/load-swagger", async (req, res) => {
  try {

    const { swaggerFile } = req.body;

    if (typeof swaggerFile !== "string" || !swaggerFile.trim()) {
      return res.status(400).json({
        success: false,
        error: "Arquivo Swagger não informado.",
      });
    }

    const swaggerPath =
      path.join(
        path.resolve("./documentation"),
        sanitizeJsonFileName(swaggerFile)
      );

    const api: any =
      await readSwaggerJson(swaggerPath);

    const servers =
      getSwaggerServers(api);

    const endpoints = [];

    for (
      const [pathName, methods]
      of Object.entries(api.paths)
    ) {
      const pathData = methods as PathItem;

      for (
        const [method, details]
        of Object.entries(pathData)
      ) {

        if (
          IGNORED_PATH_KEYS.includes(method)
        ) {
          continue;
        }

        if (
          typeof details !== "object" ||
          details === null
        ) {
          continue;
        }

        const operation =
          details as Operation;

        const mandatoryParams =
          extractParams(
            api,
            pathName,
            method,
            pathData
          );

        const allParams =
          extractAllParams(
            api,
            pathName,
            method,
            pathData
          );

        const requiredParamCount =
          Object.values(mandatoryParams).length;

        endpoints.push({
          path: pathName,
          method: method.toUpperCase(),
          summary: operation.summary || "",
          description:
            operation.description || "",
          statusCodes:
            getResponseMetadata(
              api,
              operation.responses
            ),
          params:
            Object.values(allParams),
          mandatoryParams:
            Object.values(mandatoryParams),
          requiredParamCount,
          complexity:
            getComplexity(
              requiredParamCount
            ),
        });
      }
    }

    return res.json({
      success: true,
      servers,
      endpoints
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

app.post("/generate", async (req, res) => {
  try {

    const {
      swaggerFile,
      userEmail,
      methodConfigs,
      outputFileName
    } = req.body;

    if (typeof swaggerFile !== "string" || !swaggerFile.trim()) {
      return res.status(400).json({
        success: false,
        error: "Arquivo Swagger não informado.",
      });
    }

    const swaggerPath =
      path.join(
        path.resolve("./documentation"),
        sanitizeJsonFileName(swaggerFile)
      );

    const api: any =
      await readSwaggerJson(swaggerPath);

    const configMap =
      new Map<string, MethodConfig>();

    for (const config of methodConfigs || []) {

      const key =
        `${config.method.toUpperCase()}:${config.path}`;

      configMap.set(key, {
        ...config,
        method: config.method.toUpperCase(),
        statusCodes:
          config.statusCodes?.map(String),
        mandatoryParams:
          config.mandatoryParams?.map(String),
        complexity:
          config.complexity,
      });
    }

    const testCases =
      generateTestCases(
        api,
        configMap,
        userEmail
      );

    console.log(
      `Gerando ${testCases.length} cenários`
    );

    const downloadFileName =
      sanitizeExcelFileName(outputFileName);

    const excelPath =
      path.resolve(
        `./${downloadFileName}`
      );

    await writeExcel(
      testCases,
      excelPath
    );

    return res.download(
      excelPath,
      downloadFileName
    );

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

app.listen(3000, () => {
  console.log("");
  console.log("🚀 Servidor iniciado");
  console.log(
    "http://localhost:3000"
  );
});
