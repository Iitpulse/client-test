"use client";

import { memo, useEffect, useState } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

interface RenderLatexProps {
  content: string;
}

function RenderLatexComponent({ content }: RenderLatexProps) {
  const [previewHTML, setPreviewHTML] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPreviewHTML("");
    setIsLoading(true);

    if (content?.length && content !== "<p><br></p>") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "text/html");

      // Extract from all <p> tags
      const pTags = doc.getElementsByTagName("p");

      [...pTags].forEach((p) => {
        // Regular expression to match KaTeX strings enclosed in $ or \[ and ]\
        const regex =
          /\$(.*?)\$|\\\[(.*?)\\\]|\\\[(.*?)\]\\|\\\[(.*?)\\|\[(.*?)\]\|\[(.*?)\\/g;

        // Replace the math string with the rendered KaTeX HTML
        const newSentence = p.innerHTML.replace(regex, (match) => {
          // Extract the KaTeX string from the match
          const innerHTML = match
            .replace(/\$/g, "")
            .replace(/\\\[/g, "")
            .replace(/\\\]/g, "");

          // Parse the KaTeX string and render it as an HTML string
          const html = katex.renderToString(innerHTML, {
            throwOnError: false,
          });

          // Return the rendered HTML
          return match.startsWith("$") && match.endsWith("$")
            ? html + "<br>"
            : html;
        });

        p.innerHTML = newSentence;
      });

      setPreviewHTML(doc.body.innerHTML);
    } else {
      setPreviewHTML("");
    }
    setIsLoading(false);
  }, [content]);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (!previewHTML) {
    return <p className="text-muted-foreground">Nothing to preview</p>;
  }

  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: previewHTML }}
    />
  );
}

export const RenderLatex = memo(RenderLatexComponent);
