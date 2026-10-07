"use client";

import { cn } from "cn";
import Image from "next/image";
import { useState } from "react";

import { httpsAvatarUrl } from "@/lib/avatar";

export function Avatar({
  className,
  image,
  initials,
}: {
  className?: string;
  image: string | null;
  initials: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const imageUrl = httpsAvatarUrl(image);

  return (
    <span
      className={cn(
        "inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-acc text-white dark:text-onacc",
        className
      )}
    >
      {imageUrl && failedImage !== imageUrl ? (
        <Image
          alt=""
          className="size-full object-cover"
          height={44}
          onError={() => setFailedImage(imageUrl)}
          referrerPolicy="no-referrer"
          src={imageUrl}
          unoptimized
          width={44}
        />
      ) : (
        initials
      )}
    </span>
  );
}
