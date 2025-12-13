/**
 * Environment variable schema with type validation and defaults
 * @type {Object.<string, {type: string, default: any, description: string, required: boolean}>}
 */
export const ENV_SCHEMA = {
  // Core server configuration
  NODE_ENV: {
    type: 'string',
    default: 'development',
    description: 'Node.js environment (development, production, test)',
    required: false,
    enum: ['development', 'production', 'test']
  },

  PORT: {
    type: 'number',
    default: 3000,
    description: 'Server port number',
    required: false
  },

  HOST: {
    type: 'string',
    default: 'localhost',
    description: 'Server hostname/IP to bind to',
    required: false
  },

  CORS_ORIGIN: {
    type: 'string',
    default: '*',
    description: 'CORS origin whitelist (comma-separated or wildcard)',
    required: false
  },

  // Sequential Machine (StateKit) configuration
  SEQUENTIAL_MACHINE_DIR: {
    type: 'string',
    default: null,
    description: 'Directory for Sequential Machine state (defaults to ~/.sequential-machine)',
    required: false
  },

  SEQUENTIAL_MACHINE_WORK: {
    type: 'string',
    default: null,
    description: 'Work directory for Sequential Machine (defaults to SEQUENTIAL_MACHINE_DIR/work)',
    required: false
  },

  // VFS and data storage
  VFS_DIR: {
    type: 'string',
    default: null,
    description: 'Virtual filesystem directory (defaults to ~/.sequential-vfs)',
    required: false
  },

  ZELLOUS_DATA: {
    type: 'string',
    default: null,
    description: 'Zellous collaboration data directory (defaults to ~/.zellous-data)',
    required: false
  },

  ECOSYSTEM_PATH: {
    type: 'string',
    default: null,
    description: 'Root path of Sequential Ecosystem installation',
    required: false
  },

  // Service integration
  SERVICE_BASE_URL: {
    type: 'string',
    default: 'http://localhost:3000',
    description: 'Base URL for service API calls',
    required: false
  },

  SERVICE_AUTH_TOKEN: {
    type: 'string',
    default: null,
    description: 'Authentication token for service API calls',
    required: false
  },

  // Supabase integration
  SUPABASE_URL: {
    type: 'string',
    default: null,
    description: 'Supabase project URL',
    required: false
  },

  SUPABASE_ANON_KEY: {
    type: 'string',
    default: null,
    description: 'Supabase anonymous/public API key',
    required: false
  },

  SUPABASE_SERVICE_KEY: {
    type: 'string',
    default: null,
    description: 'Supabase service role key (for server-side operations)',
    required: false
  },

  // Debugging and logging
  DEBUG: {
    type: 'boolean',
    default: false,
    description: 'Enable debug logging (true/false or 1/0)',
    required: false
  }
};
