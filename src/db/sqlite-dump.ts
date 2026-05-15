type SqlRow = Record<string, unknown>;

type TableInfoRow = {
  name: unknown;
};

export function dumpTables(
  storage: DurableObjectStorage,
  tableNames: string[],
) {
  return [
    "PRAGMA foreign_keys=OFF;",
    "BEGIN TRANSACTION;",
    ...tableNames.toReversed().map((tableName) => {
      return `DELETE FROM ${sqlIdentifier(tableName)};`;
    }),
    ...tableNames.flatMap((tableName) => dumpTable(storage, tableName)),
    "COMMIT;",
    "PRAGMA foreign_keys=ON;",
  ];
}

export function restoreStatements(
  storage: DurableObjectStorage,
  statements: string[],
) {
  storage.transactionSync(() => {
    for (const statement of statements) {
      if (isTransactionStatement(statement)) {
        continue;
      }

      storage.sql.exec(statement);
    }
  });
}

function dumpTable(storage: DurableObjectStorage, tableName: string) {
  const columns = getTableColumns(storage, tableName);
  const quotedTable = sqlIdentifier(tableName);
  const quotedColumns = columns.map(sqlIdentifier).join(", ");

  return storage.sql
    .exec(`SELECT ${quotedColumns} FROM ${quotedTable}`)
    .toArray()
    .map((row) => {
      const record = row as SqlRow;
      const values = columns.map((column) => sqlLiteral(record[column]));

      return `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES (${values.join(
        ", ",
      )});`;
    });
}

function getTableColumns(storage: DurableObjectStorage, tableName: string) {
  return storage.sql
    .exec(`PRAGMA table_info(${sqlIdentifier(tableName)})`)
    .toArray()
    .map((row) => (row as TableInfoRow).name)
    .filter((name): name is string => typeof name === "string");
}

function sqlLiteral(value: unknown) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  if (value instanceof ArrayBuffer) {
    const bytes = new Uint8Array(value);
    const hex = [...bytes]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return `X'${hex}'`;
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function isTransactionStatement(statement: string) {
  const normalized = statement.trim().replace(/;$/, "").toUpperCase();

  return normalized === "BEGIN TRANSACTION" || normalized === "COMMIT";
}
