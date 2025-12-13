import { ENV_SCHEMA } from './env-schema-definition.js';

/**
 * Get environment schema for a specific variable
 * @param {string} name - Variable name
 * @returns {Object|null} Schema definition or null if not found
 */
export function getSchemaFor(name) {
  return ENV_SCHEMA[name] || null;
}

/**
 * List all environment variables defined in schema
 * @param {Object} [filter] - Filter options
 * @param {string} [filter.type] - Filter by type (string, number, boolean)
 * @param {boolean} [filter.required] - Filter by required flag
 * @returns {Array<{name: string, ...schema}>} Array of variable definitions
 */
export function listEnvVariables(filter = {}) {
  return Object.entries(ENV_SCHEMA)
    .filter(([, schema]) => {
      if (filter.type && schema.type !== filter.type) return false;
      if (filter.required !== undefined && schema.required !== filter.required) return false;
      return true;
    })
    .map(([name, schema]) => ({ name, ...schema }));
}

/**
 * Generate documentation for environment variables
 * @returns {string} Formatted documentation
 */
export function generateEnvDocs() {
  const lines = [
    '# Environment Variables',
    '',
    'All environment variables used in Sequential Ecosystem:',
    ''
  ];

  for (const [name, schema] of Object.entries(ENV_SCHEMA)) {
    lines.push(`## ${name}`);
    lines.push(`- **Type**: ${schema.type}`);
    lines.push(`- **Required**: ${schema.required}`);
    lines.push(`- **Default**: ${schema.default === null ? 'none' : JSON.stringify(schema.default)}`);
    lines.push(`- **Description**: ${schema.description}`);
    if (schema.enum) {
      lines.push(`- **Valid values**: ${schema.enum.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
