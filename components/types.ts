export interface MediaType {
  schema?: OpenAPISchema;
  example?: any;
  examples?: { [name: string]: any };
}

export interface OpenAPISchema {
  type?: string;
  properties?: {
    [propertyName: string]: OpenAPISchema;
  };

  items?: OpenAPISchema;

  required?: string[];

  $ref?: string;

  [key: string]: any;
}

export interface Parameter {
  name: string;

  in:
    | "query"
    | "header"
    | "path"
    | "cookie"
    | "body"
    | "formData";

  description?: string;

  required?: boolean;

  schema?: OpenAPISchema;

  type?: string;

  items?: OpenAPISchema;

  properties?: {
    [propertyName: string]: OpenAPISchema;
  };

  [key: string]: any;
}

export interface RequestBody {
  description?: string;

  required?: boolean;

  content: {
    [mimeType: string]: MediaType;
  };
}

export interface Operation {
  operationId?: string;

  summary?: string;

  description?: string;

  parameters?: Parameter[];

  requestBody?: RequestBody;

  responses: {
    [statusCode: string]: any;
  };

  tags?: string[];

  [key: string]: any;
}

export interface PathItem {
  summary?: string;

  description?: string;

  parameters?: Parameter[];

  get?: Operation;

  put?: Operation;

  post?: Operation;

  delete?: Operation;

  options?: Operation;

  head?: Operation;

  patch?: Operation;

  trace?: Operation;

  [key: string]: any;
}

export interface UserInputs {
  zNumber: string;

  userEmail: string;

  swaggerFilePath: string;
}

export interface MethodConfig {
  path: string;

  method: string;

  url: string;

  summary: string;

  operationTitle?: string;

  baseUrl?: string;

  paramValues?: Record<string, string>;

  extraScenarios?: ExtraScenario[];

  requestBody?: any;

  statusCodes?: string[];

  mandatoryParams?: string[];

  complexity?: string;
}

export interface MandatoryParam {
  name: string;

  type?: string;

  description?: string;

  in?: string;

  required?: boolean;
}

export interface StepData {
  description: string;

  expectedResult: string;

  testName: string;
}

export interface TestScenario {
  label: string;

  statusCode: string;

  omittedParam?: string;

  exampleKey?: string;

  responseBody?: any;

  responseDescription?: string;

  requestBody?: any;

  manualDescription?: string;

  manualStepDescription?: string;
}

export interface ExtraScenario {
  description: string;

  stepDescription: string;
}

export interface GeneratedTestCase {
  ctFormatado: string;

  scenario: TestScenario;

  methodConfig: MethodConfig;

  endpointDesc: string;

  userEmail: string;

  mandatoryParams?: Record<
    string,
    MandatoryParam
  >;
}

export interface RowData {
  [key: string]: any;

  unique_id?: string;

  type?: string;

  name?: string;

  test_type?: string;

  designer?: string;

  description?: string;

  owner?: string;

  phase?: string;

  user_tags?: string;

  responsible_factory_udf?: string;

  test_phase_udf?: string;

  step_type?: string;

  step_description?: string;
}

export const HEADERS: string[] = [
  "unique_id",
  "type",
  "name",
  "step_type",
  "step_description",
  "test_type",
  "product_areas",
  "covered_content",
  "designer",
  "description",
  "prerequisite_udf",
  "estimated_duration",
  "owner",
  "phase",
  "user_tags",
  "responsible_factory_udf",
  "test_phase_udf",
];
