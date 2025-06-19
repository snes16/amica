export type MemoryData = {
  config: Record<string, any>;
  subconscious: any[];
  logs: { type: string; ts: number; arguments: any[] }[];
  userInputMessages: any[];
  chatLogs: any[];
};

const createEmptyMemory = (): MemoryData => ({
  config: {},
  subconscious: [],
  logs: [],
  userInputMessages: [],
  chatLogs: [],
});

// Session-scoped memory store
const memoryStore: Record<string, MemoryData> = {};

/**
 * Ensure a session has initialized memory.
 */
function ensureSessionMemory(sessionId: string): void {
  if (!memoryStore[sessionId]) {
    memoryStore[sessionId] = createEmptyMemory();
  }
}

export function readStore<K extends keyof MemoryData>(
  sessionId: string,
  key: K
): MemoryData[K] {
  ensureSessionMemory(sessionId);
  return memoryStore[sessionId][key];
}

export function writeStore<K extends keyof MemoryData>(
  sessionId: string,
  key: K,
  value: MemoryData[K]
): void {
  ensureSessionMemory(sessionId);
  memoryStore[sessionId][key] = value;
}

export function updateStore<K extends keyof MemoryData>(
  sessionId: string,
  key: K,
  values: Partial<MemoryData[K]> | any
): void {
  ensureSessionMemory(sessionId);
  const current = memoryStore[sessionId][key];

  if (Array.isArray(current)) {
    memoryStore[sessionId][key] = [...current, values];
  } else if (
    typeof current === "object" &&
    typeof values === "object" &&
    !Array.isArray(values)
  ) {
    if (values.key && values.value !== undefined) {
      const { key: configKey, value } = values;
      if (!(configKey in current)) {
        throw new Error(`Config key "${configKey}" not found.`);
      }
      current[configKey] = value;
    } else {
      for (const [propKey, propVal] of Object.entries(values)) {
        (current as any)[propKey] = propVal;
      }
    }
  } else {
    console.error("Update memory store: Invalid type");
  }
}

/**
 * Optional: clear memory for a session (e.g., on disconnect or logout)
 */
export function clearSessionMemory(sessionId: string): void {
  delete memoryStore[sessionId];
}
