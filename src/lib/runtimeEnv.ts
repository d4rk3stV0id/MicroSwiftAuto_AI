type EnvRecord = Record<string, string | undefined>;

function fromProcess(name: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  const value = (process as unknown as { env?: EnvRecord }).env?.[name];
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function fromImportMeta(name: string): string | undefined {
  const metaEnv = (import.meta as unknown as { env?: EnvRecord }).env;
  const value = metaEnv?.[name];
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const processValue = fromProcess(name);
    if (processValue) return processValue;
    const metaValue = fromImportMeta(name);
    if (metaValue) return metaValue;
  }
  return undefined;
}
