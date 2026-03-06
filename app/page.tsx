import NowPlaying from "./components/NowPlaying";

export default async function Home(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const isEmbedded = searchParams.embed === "true";

  return (
    <div
      className={`min-h-dvh flex items-center justify-center p-4 ${isEmbedded ? "is-embedded min-h-0! p-0!" : ""}`}
    >
      <NowPlaying />
    </div>
  );
}
