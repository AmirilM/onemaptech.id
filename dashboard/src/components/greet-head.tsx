"use client";

import { useState } from "react";
import { greeting } from "@/lib/names";

export default function GreetHead({ name }: { name: string }) {
  // Dihitung di browser (waktu lokal user). suppressHydrationWarning karena
  // jam server saat prerender bisa beda dengan jam browser.
  const [greet] = useState(() => greeting());
  return (
    <h1
      suppressHydrationWarning
      className="mt-1 text-2xl font-bold tracking-tight md:text-3xl"
    >
      {greet}, {name}
    </h1>
  );
}
