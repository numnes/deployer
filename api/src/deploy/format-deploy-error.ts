const MAX_LEN = 16_000;

/** Extrai mensagem legível de falhas do deploy (inclui stderr do execFile). */
export function formatDeployError(e: unknown): string {
  if (e && typeof e === 'object') {
    const err = e as { message?: string; stderr?: string; stdout?: string };
    const stderr = typeof err.stderr === 'string' ? err.stderr.trim() : '';
    const stdout = typeof err.stdout === 'string' ? err.stdout.trim() : '';
    const message = typeof err.message === 'string' ? err.message.trim() : '';

    if (stderr) {
      const lines = stderr.split('\n').filter((l) => l.trim());
      return lines.slice(-40).join('\n').slice(0, MAX_LEN);
    }
    if (message) {
      const withoutCmd = message.replace(/^Command failed:[^\n]*\n?/i, '').trim();
      return (withoutCmd || message).slice(0, MAX_LEN);
    }
    if (stdout) {
      return stdout.slice(0, MAX_LEN);
    }
  }
  return (e instanceof Error ? e.message : String(e)).slice(0, MAX_LEN);
}
