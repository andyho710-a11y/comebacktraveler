/** Sanitize only the upstream JSON parser's stderr event; preserve all other errors. */
export function installJsonParserLogPrivacy(target: Pick<Console, 'error'>, writeSafe: (event: Record<string, unknown>) => void) {
  const original = target.error.bind(target);
  target.error = (...args: unknown[]) => {
    const first = args[0];
    const detail = typeof first === 'string' ? first : first instanceof Error ? first.stack ?? '' : '';
    if (/^SyntaxError:/.test(detail) && /body-parser[\\/]lib[\\/]types[\\/]json\.js/.test(detail)) {
      writeSafe({ event: 'rfq_intake_security_event', error_code: 'INVALID_JSON', http_status: 400, status: 'rejected', timestamp: new Date().toISOString() });
      return;
    }
    original(...args);
  };
}
