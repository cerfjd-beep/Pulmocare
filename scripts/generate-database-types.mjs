import { mkdir, writeFile } from "node:fs/promises";
import { format, resolveConfig } from "prettier";

// Called against the freshly migrated local PostgreSQL catalog, never inferred from the UI.
export async function generateDatabaseTypes(db) {
  const columns = (
    await db.query(`SELECT table_name, column_name, is_nullable, column_default,
    data_type, udt_name FROM information_schema.columns WHERE table_schema='public'
    ORDER BY table_name, ordinal_position`)
  ).rows;
  const tableNames = [...new Set(columns.map((column) => column.table_name))];
  const sqlType = (name) => {
    if (name.endsWith("[]")) return `(${sqlType(name.slice(0, -2))})[]`;
    if (name.startsWith("_")) return `(${sqlType(name.slice(1))})[]`;
    if (["json", "jsonb"].includes(name)) return "Json";
    if (["bool", "boolean"].includes(name)) return "boolean";
    if (
      [
        "int2",
        "int4",
        "int8",
        "float4",
        "float8",
        "numeric",
        "integer",
        "bigint",
        "smallint",
      ].includes(name)
    )
      return "number";
    if (name === "void") return "undefined";
    return "string";
  };
  const relations = (
    await db.query(`SELECT t.relname AS source, c.conname,
    ft.relname AS target, fn.nspname AS target_schema,
    array_agg(a.attname::text ORDER BY k.ordinality) AS columns,
    array_agg(fa.attname::text ORDER BY k.ordinality) AS referenced_columns
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace
    JOIN pg_class ft ON ft.oid=c.confrelid JOIN pg_namespace fn ON fn.oid=ft.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey,c.confkey) WITH ORDINALITY k(local_id,foreign_id,ordinality)
    JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.local_id
    JOIN pg_attribute fa ON fa.attrelid=ft.oid AND fa.attnum=k.foreign_id
    WHERE c.contype='f' AND n.nspname='public'
    GROUP BY t.relname,c.conname,ft.relname,fn.nspname`)
  ).rows;
  let result =
    `// Generated from local PostgreSQL by scripts/generate-database-types.mjs.\n` +
    `// Remote schema not yet verified. Regenerate after changing migrations.\n` +
    `export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n\n` +
    `export type Database = { public: { Tables: {\n`;
  for (const table of tableNames) {
    result += `${table}: {\n`;
    for (const variant of ["Row", "Insert", "Update"]) {
      result += `${variant}: {\n`;
      for (const column of columns.filter((c) => c.table_name === table)) {
        const nullable = column.is_nullable === "YES";
        const optional =
          variant === "Update" ||
          (variant === "Insert" && (nullable || column.column_default !== null));
        result += `${column.column_name}${optional ? "?" : ""}: ${sqlType(column.udt_name)}${nullable ? " | null" : ""};\n`;
      }
      result += "};\n";
    }
    result += "Relationships: [\n";
    for (const relation of relations.filter(
      (r) => r.source === table && r.target_schema === "public",
    )) {
      result +=
        `{ foreignKeyName: ${JSON.stringify(relation.conname)}; columns: ${JSON.stringify(relation.columns)}; ` +
        `referencedRelation: ${JSON.stringify(relation.target)}; referencedColumns: ${JSON.stringify(relation.referenced_columns)}; },\n`;
    }
    result += "];\n};\n";
  }
  result += "}; Views: { [_ in never]: never }; Functions: {\n";
  const functions = (
    await db.query(`SELECT p.oid, p.proname, p.pronargs, p.pronargdefaults,
    p.proretset, format_type(p.prorettype,NULL) AS result_type
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' ORDER BY p.proname`)
  ).rows;
  for (const fn of functions) {
    const args = (
      await db.query(
        `SELECT k.ordinality, p.proargnames[k.ordinality] AS name,
      coalesce(p.proargmodes[k.ordinality],'i') AS mode, format_type(k.type_oid,NULL) AS type
      FROM pg_proc p CROSS JOIN LATERAL
      unnest(coalesce(p.proallargtypes,p.proargtypes::oid[])) WITH ORDINALITY k(type_oid,ordinality)
      WHERE p.oid=$1`,
        [fn.oid],
      )
    ).rows;
    result += `${fn.proname}: { Args: {\n`;
    for (const arg of args.filter((a) => a.mode === "i")) {
      result += `${arg.name}${Number(arg.ordinality) > fn.pronargs - fn.pronargdefaults ? "?" : ""}: ${sqlType(arg.type)};\n`;
    }
    result += "}; Returns: ";
    const out = args.filter((a) => ["o", "t"].includes(a.mode));
    let ret = out.length
      ? `{ ${out.map((a) => `${a.name}: ${sqlType(a.type)}`).join("; ")} }`
      : tableNames.includes(fn.result_type)
        ? `Database["public"]["Tables"]["${fn.result_type}"]["Row"]`
        : sqlType(fn.result_type);
    result += `${ret}${fn.proretset ? "[]" : ""}; };\n`;
  }
  result += "}; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never }; }; };\n";
  await mkdir("src/integrations/supabase", { recursive: true });
  const formatted = await format(result, {
    ...(await resolveConfig(".prettierrc.json")),
    parser: "typescript",
  });
  await writeFile("src/integrations/supabase/database.types.ts", formatted, "utf8");
  console.log(`Generated types for ${tableNames.length} tables and ${functions.length} RPCs.`);
}
