import React, { useEffect, useState } from "react";
import { splitAndKeepDelimiters } from "src/utils/utils";
import "katex/dist/katex.min.css";
import katex from "katex";

interface Props {
  quillString: string;
}

const RenderWithLatex: React.FC<Props> = ({ quillString }) => {
  const [previewHTML, setPreviewHTML] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

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
        const innerHTML = p.innerHTML;
        // regex extract value between $ and $
        let regexBoundaries = /\$(.*?)\$/g;
        let matches = innerHTML.match(regexBoundaries);

        if (matches !== null && matches?.length) {
          // Reset the innerHTML to avoid duplication of data
          p.innerHTML = "";

          // Split the innerHTML by the matches while also keeping the matches
          let allValues = splitAndKeepDelimiters(innerHTML, matches);

          allValues.forEach((item: any) => {
            if (item?.length) {
              if (item.startsWith("$") && item.endsWith("$")) {
                const withMath = katex.renderToString(item.replace(/\$/g, ""), {
                  throwOnError: false,
                });
                let span = document.createElement("span");
                span.innerHTML = withMath;
                p.appendChild(span);
              } else {
                let span = document.createElement("span");
                span.innerHTML = item;
                p.appendChild(span);
              }
            }
          });
        }
      });

      setPreviewHTML(doc.body.innerHTML);
    } else {
      setPreviewHTML("");
    }
    setIsPreviewLoading(false);
  }, [quillString]);

  return isPreviewLoading ? (
    <div>Loading...</div>
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

export default RenderWithLatex;
