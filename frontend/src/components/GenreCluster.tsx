import { ParentSize } from "@visx/responsive";
import { Wordcloud } from "@visx/wordcloud";
import { useMemo } from "react";

export function GenreCluster({
  genres,
}: {
  genres: { name: string; count: number }[];
}) {
  const words = useMemo(() => {
    return genres.map((genre) => ({
      text: genre.name,
      value: genre.count,
    }));
  }, [genres]);

  const fontScale = (datum: { value: number }) =>
    Math.log2(datum.value) * 10 + 10;
  const fontSizeSetter = (datum: { value: number }) => fontScale(datum);

  return (
    <ParentSize>
      {({ width }) => (
        <Wordcloud
          words={words}
          width={width}
          height={400}
          fontSize={fontSizeSetter}
          font="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          padding={2}
          spiral="rectangular"
          rotate={0}
          random={Math.random}
        >
          {(cloudWords) =>
            cloudWords.map((w, i) => {
              // Use different opacity values of the Spotify green (#1ed760)
              const opacity = 0.4 + (i % 6) * 0.1; // opacity from 0.4 to 0.9
              return (
                <text
                  key={w.text}
                  fill={`rgba(30, 215, 96, ${opacity})`}
                  textAnchor="middle"
                  transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                  fontSize={w.size}
                  fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
                  fontWeight="500"
                >
                  {w.text}
                </text>
              );
            })
          }
        </Wordcloud>
      )}
    </ParentSize>
  );
}
