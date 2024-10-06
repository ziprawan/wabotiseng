import { Transform } from "stream";

export async function streamToBuffer(stream: Transform): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];

    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", reject);
  });
}
