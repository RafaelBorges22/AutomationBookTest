export const HEADERS = [
  "unique_id", "type", "name", "step_type", "step_description",
  "test_type", "product_areas", "covered_content", "designer",
  "description", "prerequisite_udf", "estimated_duration", "owner",
  "phase", "user_tags", "responsible_factory_udf", "test_phase_udf"
] as const;

export type HeaderKey = typeof HEADERS[number];

export interface RowData {
  [key: string]: string;
}

export interface MandatoryParam {
  name: string;
  in: string;
}

export interface TestScenario {
  label: string;
  statusCode: string;
  omittedParam?: MandatoryParam;
  exampleKey?: string;
}

export interface MethodConfig {
  path: string;
  method: string;
  url: string;
  summary: string;
}

export interface UserInputs {
  zNumber: string;
  userEmail: string;
  swaggerFilePath: string;
}

export interface GeneratedTestCase {
  ctFormatado: string;
  scenario: TestScenario;
  methodConfig: MethodConfig;
  endpointDesc: string;
  userEmail: string;
}