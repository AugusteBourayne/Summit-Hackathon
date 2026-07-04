import Link from "next/link";
import clones from "@/seed/clones.json";

export default function Home() {
  const entries = Object.entries(clones as Record<
    string,
    { name: string; role: string; trained: boolean }
  >);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Face to Face</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Rehearse the conversation before it happens.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {entries.map(([id, clone]) => (
          <div
            key={id}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{clone.name}</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-900">
                {clone.trained ? "trained" : "not trained"}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{clone.role}</p>
            <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-100">
              created with consent
            </span>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/training/${id}`}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Train
              </Link>
              <Link
                href={`/room/${id}`}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Talk to clone
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Link href="/team" className="mt-10 inline-block text-sm underline">
        Team settings
      </Link>
    </main>
  );
}
