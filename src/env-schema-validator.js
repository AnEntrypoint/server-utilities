import { ENV_SCHEMA } from './env-schema-definition.js';

/**
 * Validate and parse an environment variable value
 * @param {string} name - Variable name
 * @param {any} value - Raw environment variable value
 * @param {Object} schema - Schema definition for the variable
 * @returns {any} Parsed and validated value
 * @throws {Error} If validation fails
 */
function validateEnvValue(name, value, schema) {
  const { type, enum: validValues, required } = schema;

  if (value === undefined || value === null || value === '') {
    if (required && schema.default === null) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return schema.default;
  }

  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        throw new Error(`${name} must be a string, got ${typeof value}`);
      }
      if (validValues && !validValues.includes(value)) {
        throw new Error(`${name} must be one of: ${validValues.join(', ')}`);
      }
      return value;

    case 'number':
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        throw new Error(`${name} must be a valid number, got "${value}"`);
      }
      return num;

    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        if (['true', '1', 'yes', 'on'].includes(value.toLowerCase())) return true;
        if (['false', '0', 'no', 'off'].includes(value.toLowerCase())) return false;
      }
      throw new Error(`${name} must be a boolean (true/false, 1/0, yes/no), got "${value}"`);

    default:
      return value;
  }
}

/**
 * Load and validate all environment variables against schema
 * @param {Object} [envObj=process.env] - Environment object to validate (defaults to process.env)
 * @returns {Object} Validated environment object
 * @throws {Error} If any required variable is missing or validation fails
 */
export function loadEnv(envObj = process.env) {
  const config = {};
  const errors = [];

  for (const [name, schema] of Object.entries(ENV_SCHEMA)) {
    try {
      const rawValue = envObj[name];
      config[name] = validateEnvValue(name, rawValue, schema);
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n  ${errors.join('\n  ')}`);
  }

  return config;
}
