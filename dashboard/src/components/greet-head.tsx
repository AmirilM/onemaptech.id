"use client";

import { useEffect, useState } from "react";
import { greeting } from "@/lib/names";

export default function GreetHead({ name }: { name: string }) {
  // Client-only: dihitung di useEffect setelah mount dengan zona Asia/Jakarta,
  // agar tidak beku di jam server (UTC) saat prerender.
  const [greet, setGreet] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setGreet(greeting(new Date()));
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <h1 className="mt-1 break-words text-xl font-bold tracking-tight text-ink md:text-2xl">
      {greet ? (
        <>
          {greet},{" "}
          <span className="text-primary">{name}</span>
        </>
      ) : (
        <>
          Hello, <span className="text-primary">{name}</span>
        </>
      )}
    </h1>
  );
}
