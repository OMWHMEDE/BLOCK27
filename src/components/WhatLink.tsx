"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

// The quiet "What is BLOCK27?" link on the landing. It forwards the current
// query string to /what so a marketing source (?src=...) survives the
// click-through and a signup made on /what is still attributed. The href is a
// plain /what, so it works without JS and the landing stays static; when JS is
// present the click carries the query along.
export function WhatLink({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Link
      href="/what"
      className={className}
      onClick={(e) => {
        const search = window.location.search;
        if (search) {
          e.preventDefault();
          router.push(`/what${search}`);
        }
      }}
    >
      {children}
    </Link>
  );
}
