import { CsvImport } from "@/components/leads/csv-import";
export default function ImportPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">LEADS</p>
          <h1>Import CSV</h1>
          <p className="subtitle">
            Review your data before adding it to the pipeline.
          </p>
        </div>
      </div>
      <CsvImport />
    </>
  );
}
