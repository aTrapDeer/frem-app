import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        backgroundImage: "linear-gradient(45deg, #6366f1, #d946ef)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "40px",
          margin: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "80px",
              fontWeight: "bold",
              background: "linear-gradient(45deg, #6366f1, #d946ef)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: "20px",
            }}
          >
            FREM
          </div>
          <div
            style={{
              fontSize: "36px",
              color: "#475569",
              marginBottom: "20px",
            }}
          >
            Forward your finances
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#64748b",
            }}
          >
            Track → Visualize → Optimize your money
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  )
}
