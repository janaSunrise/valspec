/**
 * Parse .env file content into a key-value record.
 *
 * Handles:
 * - Comments (lines starting with #)
 * - Empty lines
 * - Quoted values (single, double quotes)
 * - Multiline values with quotes
 * - Empty values
 * - Inline comments after values
 */
export function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  let currentKey: string | null = null;
  let currentValue: string[] = [];
  let inMultiline = false;
  let quoteChar: string | null = null;

  for (const line of lines) {
    // Handle multiline continuation
    if (inMultiline && currentKey) {
      const closingIndex = line.indexOf(quoteChar!);
      if (closingIndex !== -1) {
        // End of multiline value
        currentValue.push(line.substring(0, closingIndex));
        result[currentKey] = currentValue.join("\n");
        currentKey = null;
        currentValue = [];
        inMultiline = false;
        quoteChar = null;
      } else {
        currentValue.push(line);
      }
      continue;
    }

    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Parse key=value
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = line.substring(0, eqIndex).trim();
    if (!key || !isValidEnvKey(key)) {
      continue;
    }

    let value = line.substring(eqIndex + 1);

    // Handle quoted values
    const trimmedValue = value.trim();
    if (trimmedValue.startsWith('"') || trimmedValue.startsWith("'")) {
      quoteChar = trimmedValue[0]!;
      const valueContent = trimmedValue.substring(1);

      // Check if closing quote is on the same line
      const closingIndex = valueContent.indexOf(quoteChar);
      if (closingIndex !== -1) {
        // Single-line quoted value
        result[key] = valueContent.substring(0, closingIndex);
      } else {
        // Start of multiline value
        currentKey = key;
        currentValue = [valueContent];
        inMultiline = true;
      }
    } else {
      // Unquoted value - strip inline comments
      const hashIndex = value.indexOf(" #");
      if (hashIndex !== -1) {
        value = value.substring(0, hashIndex);
      }
      result[key] = value.trim();
    }
  }

  return result;
}

/**
 * Format a key-value record as .env file content.
 *
 * - Keys are sorted alphabetically
 * - Values containing special characters are quoted
 * - Multiline values use double quotes
 */
export function formatDotenv(secrets: Record<string, string>): string {
  const lines: string[] = [];

  const sortedKeys = Object.keys(secrets).sort();

  for (const key of sortedKeys) {
    const value = secrets[key]!;
    const formattedValue = formatValue(value);
    lines.push(`${key}=${formattedValue}`);
  }

  return lines.join("\n");
}

/**
 * Check if a string is a valid environment variable key.
 * Must start with a letter or underscore, followed by letters, digits, or underscores.
 */
function isValidEnvKey(key: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
}

/**
 * Format a value for .env output.
 * Quotes values that contain special characters.
 */
function formatValue(value: string): string {
  // Empty value
  if (!value) {
    return '""';
  }

  // Check if quoting is needed
  const needsQuoting =
    value.includes(" ") ||
    value.includes("#") ||
    value.includes("=") ||
    value.includes("\n") ||
    value.includes('"') ||
    value.includes("'") ||
    value.includes("$") ||
    value.includes("`") ||
    value.includes("\\");

  if (!needsQuoting) {
    return value;
  }

  // Use double quotes, escape internal double quotes and backslashes
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * Validate parsed secrets and return any validation errors.
 * Returns an array of error messages for invalid keys.
 */
export function validateSecrets(secrets: Record<string, string>): {
  valid: Record<string, string>;
  errors: string[];
} {
  const valid: Record<string, string> = {};
  const errors: string[] = [];

  for (const [key, value] of Object.entries(secrets)) {
    if (!isValidEnvKey(key)) {
      errors.push(`Invalid key: "${key}" - must start with a letter or underscore`);
      continue;
    }

    if (key.length > 256) {
      errors.push(`Key too long: "${key}" - max 256 characters`);
      continue;
    }

    if (value.length > 65536) {
      errors.push(`Value too long for "${key}" - max 65536 characters`);
      continue;
    }

    valid[key] = value;
  }

  return { valid, errors };
}
