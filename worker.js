// Root entry point for Cloudflare GitHub Builds.
// Keep one implementation in worker/src/index.js so both deploy paths agree.
export { default } from "./worker/src/index.js";
