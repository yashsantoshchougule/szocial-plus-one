export function GET() {
  const startedAt = performance.now();
  return Response.json(
    { status: "ok" },
    {
      headers: {
        "Cache-Control": "no-store",
        "Server-Timing": `app;dur=${(performance.now() - startedAt).toFixed(2)}`,
      },
    },
  );
}
