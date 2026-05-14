import type {
  PathItem,
  Parameter,
  Operation,
  MandatoryParam,
  OpenAPISchema,
} from "./types.ts";

export function extractParamRequired(parameters: Parameter[] = []): Parameter[] {
  return parameters.filter((param) => param.required);
}

/**
 * Resolve referências do swagger (#/components/schemas/...)
 */
function resolveRef(ref: string, api: any): OpenAPISchema | null {
  const refPath = ref.replace("#/", "").split("/");
  let current: any = api;

  for (const part of refPath) {
    current = current?.[part];
  }

  return current || null;
}

/**
 * Percorre o schema em cascata identificando TODOS
 * os parâmetros obrigatórios através do array "required"
 */
function walkSchema(
  schema: OpenAPISchema,
  api: any,
  parentPath = "",
  acc: Record<string, MandatoryParam> = {}
): Record<string, MandatoryParam> {
  if (!schema) return acc;

  /**
   * Resolve $ref
   */
  if ((schema as any).$ref) {
    const resolved = resolveRef((schema as any).$ref, api);

    if (resolved) {
      walkSchema(resolved, api, parentPath, acc);
    }

    return acc;
  }

  const requiredFields = schema.required || [];

  if (!schema.properties) return acc;

  for (const [key, propRaw] of Object.entries(schema.properties)) {
    let prop: any = propRaw;

    /**
     * Resolve $ref da propriedade
     */
    if (prop.$ref) {
      const resolved = resolveRef(prop.$ref, api);

      if (resolved) {
        prop = resolved;
      }
    }

    const currentPath = parentPath
      ? `${parentPath}.${key}`
      : key;

    /**
     * Campo obrigatório
     */
    if (requiredFields.includes(key)) {
      acc[currentPath] = {
        name: currentPath,
        in: "body",
        required: true,
        description: prop.description || "",
      };
    }

    /**
     * Objeto
     */
    if (prop.type === "object") {
      walkSchema(prop, api, currentPath, acc);
    }

    /**
     * Array de objetos
     */
    if (
      prop.type === "array" &&
      prop.items
    ) {
      walkSchema(
        prop.items,
        api,
        `${currentPath}[]`,
        acc
      );
    }
  }

  return acc;
}

export function extractParams(
  api: any,
  path: string,
  method: string,
  pathData: PathItem
): Record<string, MandatoryParam> {
  const mandatoryParams: Record<string, MandatoryParam> = {};

  const operation =
    pathData[
      method.toLowerCase() as keyof PathItem
    ] as Operation;

  if (!operation) return mandatoryParams;

  /**
   * Query / Header / Path params
   */
  const allParams: Parameter[] = [
    ...(pathData.parameters || []),
    ...(operation.parameters || []),
  ];

  for (const param of extractParamRequired(allParams)) {
    mandatoryParams[param.name] = {
      name: param.name,
      in: param.in,
      required: true,
    };
  }

  /**
   * Request Body
   */
  const content =
    operation.requestBody?.content?.[
      "application/json"
    ];

  if (content?.schema) {
    walkSchema(
      content.schema,
      api,
      "",
      mandatoryParams
    );
  }

  return mandatoryParams;
}