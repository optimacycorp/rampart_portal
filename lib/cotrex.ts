import "server-only";

const COTREX_DATASET_PAGE_URL = "https://data.colorado.gov/Recreation/Colorado-Trail-Explorer-COTREX-/tsn8-y22x";
const COTREX_DATASET_METADATA_URL = "https://data.colorado.gov/api/views/tsn8-y22x.json";

type CotrexDatasetMetadata = {
  name?: string | null;
  description?: string | null;
  rowsUpdatedAt?: number | null;
  metadata_updated_at?: string | null;
};

export type CotrexFetchResult = {
  summary: string;
  sourceUrl: string;
  rawStatusText: string;
  rawPayload: Record<string, unknown>;
};

function toIsoFromEpochSeconds(value?: number | null) {
  if (!value || !Number.isFinite(value)) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

export async function fetchCotrexDatasetStatus() {
  const response = await fetch(COTREX_DATASET_METADATA_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": process.env.ROAD_STATUS_USER_AGENT || process.env.NWS_USER_AGENT || "(rampart-range.org, admin@rampart-range.org)"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`COTREX metadata request failed (${response.status}) for ${COTREX_DATASET_METADATA_URL}`);
  }

  const metadata = (await response.json()) as CotrexDatasetMetadata;
  const updatedAt = toIsoFromEpochSeconds(metadata.rowsUpdatedAt) ?? metadata.metadata_updated_at ?? null;
  const datasetTitle = metadata.name ?? "Colorado Trail Explorer (COTREX)";
  const summary = updatedAt
    ? `${datasetTitle} public dataset is reachable. Metadata indicates it was updated ${new Date(updatedAt).toLocaleString()}.`
    : `${datasetTitle} public dataset is reachable through the Colorado Information Marketplace.`;

  return {
    summary,
    sourceUrl: COTREX_DATASET_PAGE_URL,
    rawStatusText: updatedAt ? `Dataset reachable; updated ${updatedAt}` : "Dataset reachable",
    rawPayload: {
      dataset_page_url: COTREX_DATASET_PAGE_URL,
      metadata_url: COTREX_DATASET_METADATA_URL,
      dataset_name: metadata.name ?? null,
      rows_updated_at: metadata.rowsUpdatedAt ?? null,
      metadata_updated_at: metadata.metadata_updated_at ?? null,
      description_excerpt: metadata.description?.slice(0, 500) ?? null
    }
  } satisfies CotrexFetchResult;
}
