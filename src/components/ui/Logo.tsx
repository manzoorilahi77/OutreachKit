import Image from "next/image";
import { LOGOS, type LogoKind } from "@/lib/brand";

type Props = {
  kind: LogoKind;
  /** Rendered height in px. Width always follows the native aspect ratio. */
  height: number;
  /** Pads every side by the anchor-mark width, the brand's clear space. */
  clearSpace?: boolean;
  alt?: string;
};

export function Logo({ kind, height, clearSpace = false, alt = "Famysys" }: Props) {
  const l = LOGOS[kind];
  const width = Math.round((height * l.w) / l.h);
  const pad = clearSpace ? Math.round(height * l.clear) : 0;
  return (
    <span className="inline-block leading-none" style={{ padding: pad }}>
      <Image src={l.src} alt={alt} width={width} height={height} unoptimized priority style={{ width, height }} />
    </span>
  );
}
