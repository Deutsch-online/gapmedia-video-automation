import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

function localFile(value, label) {
  if (!value) throw new Error(`${label} is required.`);
  const path = resolve(value);
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`${label} must point to an existing local file: ${path}`);
  }
  return path;
}

try {
  const { values } = parseArgs({
    options: {
      script: { type: "string" },
      media: { type: "string", multiple: true },
      audio: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log("npm run video:moneyprinter -- --script approved.txt --media clip.mp4 [--media other.mp4] [--audio narration.wav]");
    process.exit(0);
  }

  const script = readFileSync(localFile(values.script, "--script"), "utf8").trim();
  if (!script) throw new Error("The approved script is empty.");
  if (!values.media?.length) throw new Error("Supply at least one local file with --media.");
  const media = values.media.map((path) => localFile(path, "--media"));
  if (media.some((path) => path.includes(","))) {
    throw new Error("MoneyPrinterTurbo does not support commas in local media paths.");
  }
  const audio = values.audio ? localFile(values.audio, "--audio") : null;
  const installDir = resolve(process.env.MONEYPRINTER_DIR || fileURLToPath(new URL("../../../MoneyPrinterTurbo/", import.meta.url)));
  const python = resolve(installDir, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python");
  const cli = resolve(installDir, "cli.py");
  if (!statSync(python, { throwIfNoEntry: false }) || !statSync(cli, { throwIfNoEntry: false })) {
    throw new Error(`Install MoneyPrinterTurbo with its .venv or set MONEYPRINTER_DIR: ${installDir}`);
  }

  const args = [
    cli,
    `--video-script=${script}`,
    "--video-source", "local",
    "--video-materials", media.join(","),
    "--voice-name", "no-voice",
    "--bgm-type", "none",
    "--no-subtitle-enabled",
    "--stop-at", "video",
  ];
  if (audio) args.push("--custom-audio-file", audio);
  const result = spawnSync(python, args, { cwd: installDir, stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
