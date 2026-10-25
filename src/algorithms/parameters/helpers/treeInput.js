export function parseTreeInput(input) {
  const tokens = (Array.isArray(input) ? input.join(',') : String(input))
    .replace(/\s+/g, '').split(',');
  return tokens.map(token => {
    if (!/^\??-?\d+$/.test(token)) {
      throw new Error(`Invalid input: ${token || '(empty)'}. Use integers or ?integer for searches.`);
    }
    const search = token.startsWith('?');
    const value = Number(search ? token.slice(1) : token);
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Invalid input: ${token}. Use a safe integer.`);
    }
    return { type: search ? 'search' : 'insert', value };
  });
}

export function treeInputTokens(input) {
  return parseTreeInput(input).map(({ type, value }) => (
    type === 'search' ? `?${value}` : String(value)
  ));
}

export function legacyTreeInput(list, mode, value) {
  const tokens = Array.isArray(list) ? [...list] : list ? String(list).split(',') : [];
  if (mode === 'search' && value !== '' && value !== null && value !== undefined) {
    tokens.push(`?${value}`);
  }
  return tokens;
}
