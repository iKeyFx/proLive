import { ImageResponse } from "next/og";
import { markDataUri } from "@/lib/og/mark";

// iOS home-screen / bookmark icon. 180×180 is the modern touch-icon size.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0E1113",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={128} height={128} src={markDataUri()} alt="" />
      </div>
    ),
    { ...size },
  );
}
