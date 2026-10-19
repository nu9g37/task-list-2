export class ConfigurationError extends Error {}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || /YOUR_|CHANGE_ME|GENERATE_A_RANDOM/.test(value)) {
    throw new ConfigurationError(`Configure ${name} in .env.local.`);
  }
  return value;
}
