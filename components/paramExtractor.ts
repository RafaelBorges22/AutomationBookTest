import type { MandatoryParam } from "./types.ts";

/**
 * Recursively walks a JSON Schema object and collects every field
 * marked as required, building dot-notation paths for nested objects
 * and bracket notation for arrays.
 */
export function getBodyMandatoryParams(schema: any, parentPath = ""): MandatoryParam[] {
  const mandatory: MandatoryParam[] = [];
  if (!schema) return mandatory;

  // 1. Collect required fields at the current level
  if (schema.required && Array.isArray(schema.required)) {
    for (const reqField of schema.required as string[]) {
const fullPath = parentPath ? `${parentPath}.${reqField}` : reqField;
      mandatory.push({ name: fullPath, in: "body" });
    }
  }

  // 2. Recurse into child object properties
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties as Record<string, any>)) {
      const newPath = parentPath ? `${parentPath}.${propName}.` : `${propName}.`;
      mandatory.push(...getBodyMandatoryParams(propSchema, newPath));
    }
  }

  // 3. Recurse into array item schemas
  if (schema.type === "array" && schema.items) {
    mandatory.push(...getBodyMandatoryParams(schema.items, parentPath + "[0]."));
  }

  return mandatory;
}

/**
 * Collects all mandatory parameters for an endpoint:
 *  - header / query / path parameters
 *  - deeply nested request body fields
 */
export function getMandatoryParameters(details: any): MandatoryParam[] {
  const mandatory: MandatoryParam[] = [];

  // A. Header, query and path params
  if (details.parameters && Array.isArray(details.parameters)) {
    for (const param of details.parameters) {
      if (param.required) {
        mandatory.push({ name: param.name, in: param.in });
      }
    }
  }

  // B. Recursively extracted body fields
  const bodySchema = details.requestBody?.content?.["application/json"]?.schema;
  if (bodySchema) {
    mandatory.push(...getBodyMandatoryParams(bodySchema, ""));
  }

  return mandatory;
}