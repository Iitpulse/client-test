import React, { memo, useEffect, useState } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

interface Props {
  quillString: string;
}

const RenderWithLatex: React.FC<Props> = ({ quillString }) => {
  const [previewHTML, setPreviewHTML] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const replaceWithBR = (str: string) => {
    return str.replace(/<\/p><p>/g, "</p><br><p>");
  };

  useEffect(() => {
    setPreviewHTML("");
    setIsPreviewLoading(true);
    if (quillString?.length && quillString !== "<p><br></p>") {
      const value = quillString;
      const parser = new DOMParser();
      const doc = parser.parseFromString(value, "text/html");

      // extract from all <p> tags
      let pTags = doc.getElementsByTagName("p");

      [...pTags]?.forEach((p) => {
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
            // displayMode: true,
            throwOnError: false,
          });

          // Return the rendered HTML, followed by a line break if the math string was enclosed in $
          return match.startsWith("$") && match.endsWith("$")
            ? html + "<br>"
            : html;
        });

        // Append the new sentence to the target element
        p.innerHTML = newSentence;
      });

      setPreviewHTML(doc.body.innerHTML);
    } else {
      setPreviewHTML("");
    }
    setIsPreviewLoading(false);
  }, [quillString]);

  return isPreviewLoading ? (
    <div>
      <p>Loading...</p>
    </div>
  ) : !previewHTML ? (
    <div>
      <p>Nothing to preview</p>
    </div>
  ) : (
    <div
      dangerouslySetInnerHTML={{ __html: previewHTML }}
      // style={{ maxHeight: "550PX", overflowY: "auto", overflowX: "hidden" }}
    ></div>
  );
};

export default memo(RenderWithLatex);
