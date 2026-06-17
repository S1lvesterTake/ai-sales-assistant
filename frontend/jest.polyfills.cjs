/* eslint-disable @typescript-eslint/no-require-imports */
const { Blob, File } = require("node:buffer");
const { TextDecoder, TextEncoder } = require("node:util");
const { ReadableStream, TransformStream, WritableStream } = require("node:stream/web");
const { BroadcastChannel, MessageChannel, MessagePort } = require("node:worker_threads");
const { clearImmediate, setImmediate } = require("node:timers");

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

Object.assign(globalThis, {
  Blob,
  BroadcastChannel,
  clearImmediate,
  File,
  MessageChannel,
  MessagePort,
  ReadableStream,
  setImmediate,
  TextDecoder,
  TextEncoder,
  TransformStream,
  WritableStream,
});

Object.defineProperty(globalThis.performance, "markResourceTiming", {
  configurable: true,
  value: () => undefined,
});

const { fetch, FormData, Headers, Request, Response } = require("undici");

Object.assign(globalThis, {
  fetch,
  FormData,
  Headers,
  Request,
  Response,
});
