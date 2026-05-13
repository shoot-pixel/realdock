declare module "archiver" {
  import { Transform } from "stream";

  interface ZipOptions {
    zlib?: { level?: number };
    store?: boolean;
  }

  interface EntryData {
    name: string;
    date?: Date | string;
  }

  export class ZipArchive extends Transform {
    constructor(options?: ZipOptions);
    append(
      source: NodeJS.ReadableStream | Buffer | string,
      data: EntryData,
    ): this;
    finalize(): Promise<void>;
    pointer(): number;
    abort(): Promise<void>;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "end" | "close" | "finish", listener: () => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }
}
