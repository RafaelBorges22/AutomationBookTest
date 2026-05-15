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
  const refPath = ref
    .replace("#/", "")
    .split("/")
    .map((part) =>
      part
        .replace(/~1/g, "/")
        .replace(/~0/g, "~")
    );

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
  schema: OpenAPISchema | undefined,
  api: any,
  parentPath = "",
  acc: Record<string, MandatoryParam> = {},
  requiredOnly = true,
  visitedRefs = new Set<string>()
): Record<string, MandatoryParam> {
  if (!schema) return acc;

  if ((schema as any).$ref) {
    const ref = (schema as any).$ref;

    if (visitedRefs.has(ref)) {
      return acc;
    }

    const resolved = resolveRef(ref, api);

    if (resolved) {
      walkSchema(
        resolved,
        api,
        parentPath,
        acc,
        requiredOnly,
        new Set([...visitedRefs, ref])
      );
    }

    return acc;
  }

  const composedSchemas = [
    ...((schema as any).allOf || []),
    ...((schema as any).oneOf || []),
    ...((schema as any).anyOf || []),
  ];

  for (const composedSchema of composedSchemas) {
    walkSchema(
      composedSchema,
      api,
      parentPath,
      acc,
      requiredOnly,
      new Set(visitedRefs)
    );
  }

  if (schema.items) {
    walkSchema(
      schema.items,
      api,
      parentPath ? `${parentPath}[]` : "",
      acc,
      requiredOnly,
      new Set(visitedRefs)
    );
  }

  const requiredFields = schema.required || [];

  if (!schema.properties) return acc;

  for (const [key, propRaw] of Object.entries(schema.properties)) {
    let prop: any = propRaw;
    let nextVisitedRefs = new Set(visitedRefs);

    if (prop.$ref) {
      if (nextVisitedRefs.has(prop.$ref)) {
        continue;
      }

      const resolved = resolveRef(prop.$ref, api);

      if (resolved) {
        nextVisitedRefs.add(prop.$ref);
        prop = resolved;
      }
    }

    const currentPath = parentPath
      ? `${parentPath}.${key}`
      : key;

    const isRequired =
      requiredFields.includes(key);

    if (!requiredOnly || isRequired) {
      acc[currentPath] = {
        name: currentPath,
        in: "body",
        required: isRequired,
        description: prop.description || "",
        type: prop.type,
      };
    }

    if (
      prop.type === "object" ||
      prop.properties ||
      prop.allOf ||
      prop.oneOf ||
      prop.anyOf
    ) {
      walkSchema(
        prop,
        api,
        currentPath,
        acc,
        requiredOnly,
        nextVisitedRefs
      );
    }

    if (
      prop.type === "array" &&
      prop.items
    ) {
      walkSchema(
        prop.items,
        api,
        `${currentPath}[]`,
        acc,
        requiredOnly,
        nextVisitedRefs
      );
    }
  }

  return acc;
}

export function extractParams(
  api: any,
  path: string,
  method: string,
  pathData: PathItem,
  requiredOnly = true
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

  const selectedParams =
    requiredOnly
      ? extractParamRequired(allParams)
      : allParams;

  for (const param of selectedParams) {
    mandatoryParams[param.name] = {
      name: param.name,
      in: param.in,
      required: Boolean(param.required),
      description: param.description || "",
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
      mandatoryParams,
      requiredOnly
    );
  }

  return mandatoryParams;
}

export function extractAllParams(
  api: any,
  path: string,
  method: string,
  pathData: PathItem
): Record<string, MandatoryParam> {
  return extractParams(
    api,
    path,
    method,
    pathData,
    false
  );
}
