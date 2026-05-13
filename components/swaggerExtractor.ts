import * as fs from "node:fs/promises";

import type {
  PathItem,
  Operation,
  RequestBody,
  MediaType,
} from "./types.ts";

/**
 * Cache simples do Swagger
 */
let cachedSwagger: any = null;

let cachedPath = "";

/**
 * Lê o Swagger apenas uma vez
 */
async function getSwaggerJson(
  filePath: string
) {
  if (
    cachedSwagger &&
    cachedPath === filePath
  ) {
    return cachedSwagger;
  }

  const content = await fs.readFile(
    filePath,
    "utf-8"
  );

  cachedSwagger = JSON.parse(content);

  cachedPath = filePath;

  return cachedSwagger;
}

/**
 * Resolve $ref internos
 */
function resolveRef(
  swagger: any,
  ref: string
): any {
  if (!ref.startsWith("#/")) {
    return null;
  }

  const parts = ref
    .replace(/^#\//, "")
    .split("/");

  let current = swagger;

  for (const part of parts) {
    current = current?.[part];

    if (!current) {
      return null;
    }
  }

  return current;
}

/**
 * Gera mock automático baseado no schema
 */
function buildExampleFromSchema(
  swagger: any,
  schema: any
): any {
  if (!schema) {
    return {};
  }

  // resolve $ref
  if (schema.$ref) {
    const resolved = resolveRef(
      swagger,
      schema.$ref
    );

    return buildExampleFromSchema(
      swagger,
      resolved
    );
  }

  // example direto
  if (schema.example) {
    return schema.example;
  }

  // objeto
  if (
    schema.type === "object" ||
    schema.properties
  ) {
    const obj: any = {};

    for (const [key, prop] of Object.entries(
      schema.properties || {}
    )) {
      obj[key] = buildExampleFromSchema(
        swagger,
        prop
      );
    }

    return obj;
  }

  // array
  if (
    schema.type === "array" &&
    schema.items
  ) {
    return [
      buildExampleFromSchema(
        swagger,
        schema.items
      ),
    ];
  }

  // tipos primitivos
  switch (schema.type) {
    case "string":
      return "string";

    case "integer":
      return 0;

    case "number":
      return 0;

    case "boolean":
      return true;

    default:
      return null;
  }
}

/**
 * Busca REQUEST BODY
 */
export async function extractRequestBody(
  filePath: string,
  path: string,
  method: string
): Promise<any | null> {
  try {
    const swagger = await getSwaggerJson(
      filePath
    );

    const operation =
      swagger.paths?.[
        path
      ]?.[
        method.toLowerCase()
      ] as Operation;

    if (
      !operation ||
      !operation.requestBody
    ) {
      return null;
    }

    const content =
      (
        operation.requestBody as RequestBody
      ).content?.[
        "application/json"
      ];

    if (!content) {
      return null;
    }

    // example direto
    if (content.example) {
      return content.example;
    }

    // examples
    if (content.examples) {
      const firstExample = Object.values(
        content.examples
      )[0] as any;

      // OpenAPI 3 usa value
      if (firstExample?.value) {
        return firstExample.value;
      }

      return firstExample;
    }

    // schema.example
    if (content.schema?.example) {
      return content.schema.example;
    }

    // build automático via schema
const example =
  buildExampleFromSchema(
    swagger,
    content.schema
  );

const schemaName =
  extractSchemaName(content.schema);

return {
  ...example,
  __schemaName: schemaName,
};
  } catch (error) {
    console.error(
      "Erro ao extrair request body:",
      error
    );

    return null;
  }
}

/**
 * Busca RESPONSE BODY
 */
export async function extractResponseBody(
  filePath: string,
  path: string,
  method: string
): Promise<any |null> {
  try {
    const swagger = await getSwaggerJson(
      filePath
    );

    const operation =
      swagger.paths?.[
        path
      ]?.[
        method.toLowerCase()
      ] as Operation;

    if (!operation) {
      return null;
    }

    const successResponse =
      operation.responses?.["200"] ||
      operation.responses?.["201"] ||
      operation.responses?.["202"];

    if (!successResponse) {
      return null;
    }

    const content =
      successResponse.content?.[
        "application/json"
      ] as MediaType;

    if (!content) {
      return null;
    }

    if (content.example) {
      return content.example;
    }

    if (content.examples) {
      const firstExample = Object.values(
        content.examples
      )[0] as any;

      if (firstExample?.value) {
        return firstExample.value;
      }

      return firstExample;
    }

    if (content.schema?.example) {
      return content.schema.example;
    }

    return buildExampleFromSchema(
      swagger,
      content.schema
    );
  } catch (error) {
    console.error(
      "Erro ao extrair response body:",
      error
    );

    return null;
  }

  function extractSchemaName(
  schema: any
): string | null {
  if (!schema?.$ref) {
    return null;
  }

  const parts = schema.$ref.split("/");

  return parts[parts.length - 1] || null;
}
}