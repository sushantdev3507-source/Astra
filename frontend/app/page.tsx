import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-zinc-950 text-center">
      <Image
        src="/branding/astra-logo.jpeg"
        alt="Astra — Photo & PPT Editor"
        width={352}
        height={192}
        className="rounded-xl"
        priority
      />
      <p className="text-zinc-500">Asset editing tool for 5onam.ai</p>
      <Link
        href="/editor"
        className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
      >
        Open Astra Editor
      </Link>
    </div>
  );
}
