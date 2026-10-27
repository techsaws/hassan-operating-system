import Link from "next/link";
export default function NotFound() {
  return (
    <div className="panel p-8">
      <h1>Lead not found</h1>
      <p className="my-4 text-zinc-500">This record does not exist.</p>
      <Link href="/leads" className="text-teal-800 underline">
        Return to leads
      </Link>
    </div>
  );
}
