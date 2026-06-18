export type SqlBindable = string | number | null | Uint8Array;

export type SqlRunResult = {
  changes: number;
  lastInsertRowId?: number;
};

export type Database = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: readonly SqlBindable[]): Promise<SqlRunResult>;
  getFirstAsync<T>(sql: string, params?: readonly SqlBindable[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: readonly SqlBindable[]): Promise<T[]>;
  withTransactionAsync?<T>(task: () => Promise<T>): Promise<T>;
};

export type DatabaseProvider = () => Promise<Database>;

const transactionDepths = new WeakMap<Database, number>();
let savepointCounter = 0;

async function runInSavepoint<T>(database: Database, task: () => Promise<T>): Promise<T> {
  const savepointName = `storage_tx_${++savepointCounter}`;
  const previousDepth = transactionDepths.get(database) ?? 0;

  await database.execAsync(`SAVEPOINT ${savepointName}`);
  transactionDepths.set(database, previousDepth + 1);

  try {
    const result = await task();
    await database.execAsync(`RELEASE SAVEPOINT ${savepointName}`);
    return result;
  } catch (error) {
    await database.execAsync(`ROLLBACK TO SAVEPOINT ${savepointName}`);
    await database.execAsync(`RELEASE SAVEPOINT ${savepointName}`);
    throw error;
  } finally {
    if (previousDepth === 0) {
      transactionDepths.delete(database);
    } else {
      transactionDepths.set(database, previousDepth);
    }
  }
}

export async function runInTransaction<T>(database: Database, task: () => Promise<T>): Promise<T> {
  const currentDepth = transactionDepths.get(database) ?? 0;

  if (currentDepth > 0) {
    return runInSavepoint(database, task);
  }

  if (database.withTransactionAsync) {
    transactionDepths.set(database, 1);

    try {
      return await database.withTransactionAsync(task);
    } finally {
      transactionDepths.delete(database);
    }
  }

  await database.execAsync("BEGIN");
  transactionDepths.set(database, 1);

  try {
    const result = await task();
    await database.execAsync("COMMIT");
    return result;
  } catch (error) {
    await database.execAsync("ROLLBACK");
    throw error;
  } finally {
    transactionDepths.delete(database);
  }
}
