import { psvSupabase } from "@/utils/supabase";

// Session-scoped memory store
const serverConfig: Record<string, Record<string, string>> = {};

/**
 * Ensure a session has initialized memory.
 */
function ensureSessionMemory(sessionId: string): void {
  if (!serverConfig[sessionId]) {
    serverConfig[sessionId] = {};
  }
}

export async function readStore(sessionId: string, storeName: string): Promise<any> {
  try {
    const { data, error, status } = await psvSupabase
      .schema("external-api")
      .from(`${storeName}`)
      .select('data')
      .eq('session_id', sessionId)
      .maybeSingle(); // returns null if not found, no throw

    if (error && status !== 406) {
      console.error(`Supabase error reading ${storeName}:`, error.message);
      throw new Error(`Failed to read ${storeName} from Supabase.`);
    }

    return data?.data ?? {};
  } catch (err) {
    console.error(`Unexpected error reading ${storeName}:`, err);
    throw err;
  }
}

export async function updateStore(sessionId: string, storeName: string, newData: any): Promise<boolean> {
  try {
    // Step 1: Read current data
    const { data: existingRow, error, status } = await psvSupabase
      .schema("external-api")
      .from(`${storeName}`)
      .select('data')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error && status !== 406) {
      console.error(`Supabase error reading ${storeName}:`, error.message);
      return false;
    }

    const existingData = existingRow?.data ?? [];

    // Step 2: Merge data depending on type
    let mergedData: any;

    if (Array.isArray(existingData)) {
      mergedData = [...existingData, newData]; // append to array
    } else if (typeof existingData === 'object' && typeof newData === 'object') {
      mergedData = { ...existingData, ...newData }; // shallow merge object
    } else {
      console.warn(`updateStore: Unexpected data type in ${storeName}, overwrite with new data`);
      mergedData = newData;
    }

    // Step 3: Upsert merged data
    const { error: upsertError } = await psvSupabase
      .schema("external-api")
      .from(`${storeName}`)
      .upsert({
        session_id: sessionId,
        data: mergedData,
        created_at: new Date().toISOString(), // optional, if you want to update timestamps
      });

    if (upsertError) {
      console.error(`Supabase upsert failed for ${storeName}:`, upsertError.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Unexpected error in updateStore(${storeName}):`, err);
    return false;
  }
}


export function readServerConfig( sessionId: string) {
  ensureSessionMemory(sessionId);
  return serverConfig[sessionId];
}

export function writeServerConfig(sessionId: string, configs: Record<string, string>) {
  ensureSessionMemory(sessionId);
  serverConfig[sessionId] = configs;
}

/**
 * Optional: clear memory for a session (e.g., on disconnect or logout)
 */
export function clearSessionMemory(sessionId: string): void {
  delete serverConfig[sessionId];
}
