// @ts-ignore
import tailwindConfig from "@/../../tailwind.config";

export default function Layout({
  title,
  children,
  scripts,
}: {
  title?: string;
  scripts?: { src: string; position: "top" | "bottom" }[];
  children: any;
}) {
  return (
    <html>
      <head>
        <title>OPC Bot | {title ?? "-"}</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="/assets/tailwindcss-3.4.16.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `tailwind.config = {theme: ${JSON.stringify(tailwindConfig.theme ?? {})}}`,
          }}
        ></script>
        {scripts && scripts.filter((s) => s.position === "top").map((s) => <script src={s.src}></script>)}
      </head>
      <body class={"bg-[#130f17] text-[#f8fafc]"}>{children}</body>
      {scripts && scripts.filter((s) => s.position === "bottom").map((s) => <script src={s.src}></script>)}
    </html>
  );
}
