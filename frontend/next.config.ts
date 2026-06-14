import type { NextConfig } from "next";

import { getPublicEnv } from "./lib/env";

getPublicEnv();

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: [
    "msw",
    "@mswjs/interceptors",
    "@open-draft/deferred-promise",
    "headers-polyfill",
    "is-node-process",
    "outvariant",
    "rettime",
    "strict-event-emitter",
    "until-async",
  ],
};

export default nextConfig;
