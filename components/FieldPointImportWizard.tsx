"use client";

import { useMemo, useState } from "react";
import {
  FIELD_POINT_CONFIDENCE_OPTIONS,
  FIELD_POINT_IMPORT_FIELDS,
  FIELD_POINT_TYPE_OPTIONS,
  inferConfidence,
  inferFieldMapping,
  inferPointType,
  validateFieldPointImportRow
} from "@/lib/field-point-import";
import { FieldPointImportRow } from "@/lib/types";

type FieldPointImportWizardProps = {
  action: (formData: FormData) => Promise<void>;
};

type RawRow = Record<string, string>;

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { headers: [] as string[], rows: [] as RawRow[] };
  }

  const parseLine = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];

      if (character === '"') {
        if (insideQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (character === "," && !insideQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += character;
      }
    }

    cells.push(current.trim());
    return cells;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    return headers.reduce<RawRow>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? "";
      return accumulator;
    }, {});
  });

  return { headers, rows };
}

function parseNumeric(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function FieldPointImportWizard({ action }: FieldPointImportWizardProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importBatchName, setImportBatchName] = useState("");
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});

  const previewRows = useMemo(() => {
    if (rows.length === 0) {
      return [] as FieldPointImportRow[];
    }

    return rows.map((row) =>
      validateFieldPointImportRow({
        point_name: row[columnMap.point_name ?? ""]?.trim() ?? "",
        point_type: inferPointType(
          row[columnMap.point_type ?? ""]?.trim() ?? "",
          row[columnMap.description ?? ""]?.trim() ?? ""
        ),
        easting: parseNumeric(row[columnMap.easting ?? ""] ?? ""),
        northing: parseNumeric(row[columnMap.northing ?? ""] ?? ""),
        elevation: parseNumeric(row[columnMap.elevation ?? ""] ?? ""),
        coordinate_system: row[columnMap.coordinate_system ?? ""]?.trim() ?? "",
        latitude: parseNumeric(row[columnMap.latitude ?? ""] ?? ""),
        longitude: parseNumeric(row[columnMap.longitude ?? ""] ?? ""),
        description: row[columnMap.description ?? ""]?.trim() ?? "",
        source_equipment: row[columnMap.source_equipment ?? ""]?.trim() ?? "",
        collection_method: row[columnMap.collection_method ?? ""]?.trim() ?? "",
        collected_at: row[columnMap.collected_at ?? ""]?.trim() ?? "",
        confidence: inferConfidence(
          row[columnMap.confidence ?? ""]?.trim() ?? "",
          row[columnMap.collection_method ?? ""]?.trim() ?? ""
        )
      })
    );
  }, [columnMap, rows]);

  const validCount = previewRows.filter((row) => row.validationIssues.length === 0).length;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setHeaders([]);
      setRows([]);
      setColumnMap({});
      setFileName("");
      return;
    }

    const text = await file.text();
    const parsed = parseCsv(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setFileName(file.name);
    setColumnMap(inferFieldMapping(parsed.headers));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
        <h2 className="text-xl font-semibold text-ink">Upload CSV</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Import Emlid or field-collected GPS points, review the parsed rows, then save only the valid records.
        </p>
        <div className="mt-4">
          <input
            accept=".csv,text/csv"
            className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            onChange={handleFileChange}
            type="file"
          />
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Import batch name</span>
          <input
            value={importBatchName}
            onChange={(event) => setImportBatchName(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="As-Built May 2026"
            type="text"
          />
        </label>
        {fileName ? (
          <p className="mt-3 text-sm text-slate-500">
            Loaded <span className="font-medium text-slate-700">{fileName}</span> with {rows.length} rows.
          </p>
        ) : null}
      </div>

      {headers.length > 0 ? (
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Column mapping</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FIELD_POINT_IMPORT_FIELDS.map((field) => (
              <label key={field} className="block">
                <span className="mb-2 block text-sm font-medium capitalize text-slate-700">
                  {field.replaceAll("_", " ")}
                </span>
                <select
                  value={columnMap[field] ?? ""}
                  onChange={(event) =>
                    setColumnMap((current) => ({
                      ...current,
                      [field]: event.target.value
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
                >
                  <option value="">Unmapped</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Allowed point types: {FIELD_POINT_TYPE_OPTIONS.join(", ")}
            <br />
            Allowed confidence values: {FIELD_POINT_CONFIDENCE_OPTIONS.join(", ")}
            <br />
            Emlid exports with headers like <code>Name</code>, <code>Code</code>, <code>Easting</code>,
            <code className="mx-1">Northing</code>, <code>CS name</code>, and <code>Solution status</code> are
            auto-mapped.
          </div>
        </div>
      ) : null}

      {previewRows.length > 0 ? (
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Preview and validation</h2>
              <p className="mt-2 text-sm text-slate-600">
                {validCount} valid rows ready to save out of {previewRows.length}.
              </p>
            </div>
            <form action={action}>
              <input type="hidden" name="rows_json" value={JSON.stringify(previewRows)} readOnly />
              <input type="hidden" name="source_file_name" value={fileName} readOnly />
              <input type="hidden" name="import_batch_name" value={importBatchName} readOnly />
              <button
                type="submit"
                className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Save valid rows
              </button>
            </form>
          </div>
          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1.4fr] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span>Point</span>
              <span>Type</span>
              <span>Easting / Northing</span>
              <span>Lat / Lon</span>
              <span>Confidence</span>
              <span>Validation</span>
            </div>
            <div className="divide-y divide-slate-100">
              {previewRows.map((row, index) => {
                const missingValue = "—";

                return (
                  <div
                    key={`${row.point_name}-${index}`}
                    className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1.4fr] gap-4 px-4 py-4 text-sm"
                  >
                    <span className="text-slate-700">{row.point_name || "Missing"}</span>
                    <span className="text-slate-700">{row.point_type || "Missing"}</span>
                    <span className="text-slate-600">
                      {row.easting ?? missingValue} / {row.northing ?? missingValue}
                    </span>
                    <span className="text-slate-600">
                      {row.latitude ?? missingValue} / {row.longitude ?? missingValue}
                    </span>
                    <span className="text-slate-600">{row.confidence}</span>
                    <div className="text-sm">
                      {row.validationIssues.length === 0 ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          Valid
                        </span>
                      ) : (
                        <div className="space-y-1 text-rose-700">
                          {row.validationIssues.map((issue) => (
                            <div key={issue}>{issue}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
