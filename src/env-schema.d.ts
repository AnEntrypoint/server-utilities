/**
 * Environment variable schema definition
 */
export interface EnvSchemaDefinition {
  type: 'string' | 'number' | 'boolean';
  default: any;
  description: string;
  required: boolean;
  enum?: string[];
}

/**
 * Complete environment variable schema
 */
export declare const ENV_SCHEMA: Record<string, EnvSchemaDefinition>;

/**
 * Validate and parse an environment variable value
 * @param name Variable name
 * @param value Raw environment variable value
 * @param schema Schema definition for the variable
 * @returns Parsed and validated value
 * @throws If validation fails
 */
export declare function validateEnvValue(
  name: string,
  value: any,
  schema: EnvSchemaDefinition
): any;

/**
 * Load and validate all environment variables against schema
 * @param envObj Environment object to validate (defaults to process.env)
 * @returns Validated environment object
 * @throws If any required variable is missing or validation fails
 */
export declare function loadEnv(envObj?: NodeJS.ProcessEnv): Record<string, any>;

/**
 * Get environment schema for a specific variable
 * @param name Variable name
 * @returns Schema definition or null if not found
 */
export declare function getSchemaFor(name: string): EnvSchemaDefinition | null;

/**
 * Filter options for listing environment variables
 */
export interface EnvListFilter {
  type?: 'string' | 'number' | 'boolean';
  required?: boolean;
}

/**
 * List all environment variables defined in schema
 * @param filter Filter options
 * @returns Array of variable definitions
 */
export declare function listEnvVariables(
  filter?: EnvListFilter
): Array<{ name: string } & EnvSchemaDefinition>;

/**
 * Generate documentation for environment variables
 * @returns Formatted documentation
 */
export declare function generateEnvDocs(): string;
