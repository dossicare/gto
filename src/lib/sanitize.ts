import sanitizeHtml from "sanitize-html";

/**
 * Allow-list sanitiser for the official General Terms HTML (mirrors knowledge/official_terms.py).
 * Scripts, styles, frames and every attribute except a checked link target are removed.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "p", "ol", "ul", "li", "strong", "b", "em", "i", "u", "br",
    "a", "table", "thead", "tbody", "tr", "td", "th", "blockquote",
  ],
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["https", "http", "mailto"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  nonTextTags: ["style", "script", "textarea", "option", "noscript", "iframe", "object", "embed"],
  transformTags: {
    a: (_tag, attribs) => ({
      tagName: "a",
      attribs: { href: attribs.href ?? "", rel: "noopener noreferrer", target: "_blank" },
    }),
  },
};

export function sanitizeTerms(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
