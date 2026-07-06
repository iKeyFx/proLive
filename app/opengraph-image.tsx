import { ImageResponse } from "next/og";
import { markDataUri } from "@/lib/og/mark";

// Standard 1200×630 social card, rendered in the app's own visual language.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ProLive — a precision trading desk";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0E1113",
          color: "#ECEFF1",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img width={72} height={72} src={markDataUri()} alt="" />
          <span style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1 }}>
            Pro<span style={{ color: "#97A1A8" }}>Live</span>
          </span>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 78, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            A precision trading desk
          </span>
          <span style={{ fontSize: 34, color: "#97A1A8" }}>
            Live prices · simulated money · real-money correctness
          </span>
        </div>

        {/* footer accent row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 12, height: 12, borderRadius: 99, background: "#3FB68B", display: "flex" }} />
          <span style={{ fontSize: 26, color: "#97A1A8" }}>
            Real-time · Next.js · TypeScript · Supabase
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
