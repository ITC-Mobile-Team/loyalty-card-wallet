import type { DatabaseProvider } from "./Database";
import { runInTransaction } from "./Database";

export type StorageTransactionRunner = {
  run<T>(task: () => Promise<T>): Promise<T>;
};

export const noStorageTransactionRunner: StorageTransactionRunner = {
  run<T>(task: () => Promise<T>): Promise<T> {
    return task();
  }
};

export class SQLiteStorageTransactionRunner implements StorageTransactionRunner {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    const database = await this.databaseProvider();
    return runInTransaction(database, task);
  }
}
