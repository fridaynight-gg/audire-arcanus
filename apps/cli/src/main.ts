const help = `audire
  serve     start HTTP on :5551
  --help    this text
`

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(help)
  process.exit(0)
}

const { Layer } = await import("effect")
const { BunRuntime } = await import("@effect/platform-bun")
const { HttpLive } = await import("@audire/server")

BunRuntime.runMain(Layer.launch(HttpLive))
