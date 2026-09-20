import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, "dist");

const routes = [
  {
    path: "",
    source: "index.html",
    title: "The Wedding of Anchen & Joe",
    home: true,
  },
  {
    path: "order-of-the-day",
    source: "order-of-the-day-snippet.html",
    title: "Order of the Day",
  },
  {
    path: "the-reception",
    source: "the-evening-snippet.html",
    title: "The Reception",
  },
  { path: "story-time", source: "our-story-snippet.html", title: "Our Story" },
  { path: "rats", source: "rats-snippet.html", title: "Our Fancy Rats" },
  {
    path: "the-castle",
    source: "the-castle-snippet.html",
    title: "Powderham Castle",
  },
  {
    path: "travel---accommodation",
    source: "map-snippet.html",
    title: "Travel & Accommodation",
  },
  {
    path: "q---a-s",
    source: "faq-snippet-v2.html",
    title: "Questions & Answers",
    requiredRole: "ceremony",
  },
  {
    path: "food",
    source: "menu-snippet.html",
    title: "Our Menu",
    requiredRole: "ceremony",
  },
  {
    path: "rsvp",
    source: "rsvp-snippet.html",
    title: "RSVP",
    requiredRole: "ceremony",
  },
  {
    path: "evening-qa",
    source: "faq-snippet-v2.html",
    title: "Evening Guests Q&A",
    requiredRole: "evening",
    headingReplacement: ["Questions &amp; Answers", "Evening Guests Q&amp;A"],
  },
  {
    path: "evening-rsvp",
    source: "rsvp-snippet.html",
    title: "Evening Guests RSVP",
    requiredRole: "evening",
    headingReplacement: [">RSVP<", ">Evening Guests RSVP<"],
  },
  {
    path: "hidden-game",
    source: "wedding-game-snippet-v2.html",
    title: "Race to the Wedding",
  },
];

const navigation = [
  ["Order of the Day", "/order-of-the-day/", "ceremony"],
  ["The Reception", "/the-reception/"],
  ["Our Story", "/story-time/"],
  ["The Castle", "/the-castle/"],
  ["Travel", "/travel---accommodation/"],
  ["Q&A", "/q---a-s/", "ceremony"],
  ["Food & Drink", "/food/", "ceremony"],
  ["RSVP", "/rsvp/", "ceremony"],
  ["Evening Q&A", "/evening-qa/", "evening"],
  ["Evening RSVP", "/evening-rsvp/", "evening"],
];

const template = fs.readFileSync(
  path.join(root, "src", "template.html"),
  "utf8",
);
const siteCss = fs.readFileSync(path.join(root, "src", "site.css"), "utf8");
const siteJs = fs.readFileSync(path.join(root, "src", "site.js"), "utf8");
const homeSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const homeStyle = homeSource.match(/<style>([\s\S]*?)<\/style>/i)?.[1] ?? "";

function getBody(source) {
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return body ? body[1] : source;
}

function getContent(route) {
  const source = fs.readFileSync(path.join(root, route.source), "utf8");
  let content = route.home ? getBody(source) : source;
  content = content
    .replace(/<link[^>]+>/gi, "")
    .replace(/<p class="footer-note">[\s\S]*?<\/p>/i, "")
    .replace(
      /(src|href)=["']websites\/([^"']+)["']/gi,
      (match, attribute, assetPath) => {
        const assetFile = path.join(root, "websites", assetPath);
        const publicPath = fs.existsSync(assetFile)
          ? `/websites/${assetPath}`
          : "/placeholders/wedding-photo.svg";
        return `${attribute}="${publicPath}"`;
      },
    );
  if (route.headingReplacement) {
    content = content.replace(
      route.headingReplacement[0],
      route.headingReplacement[1],
    );
  }
  return content;
}

function renderNavigation(items) {
  return items
    .map(([label, href, requiredRole]) => {
      // Start role-gated links hidden so nothing wraps to a second line and shifts the header before JS confirms the guest's role.
      const roleAttribute = requiredRole
        ? ` data-required-role="${requiredRole}" hidden aria-hidden="true"`
        : "";
      return `<li${roleAttribute}><a href="${href}">${label}</a></li>`;
    })
    .join("");
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "site.css"), siteCss);
fs.writeFileSync(path.join(output, "site.js"), siteJs);
fs.cpSync(path.join(root, "public"), output, { recursive: true });
if (fs.existsSync(path.join(root, "websites"))) {
  fs.cpSync(path.join(root, "websites"), path.join(output, "websites"), {
    recursive: true,
  });
}
fs.copyFileSync(
  path.join(root, "staticwebapp.config.json"),
  path.join(output, "staticwebapp.config.json"),
);

for (const route of routes) {
  const pageDirectory = route.path ? path.join(output, route.path) : output;
  fs.mkdirSync(pageDirectory, { recursive: true });
  const page = template
    .replaceAll("{{PAGE_TITLE}}", route.title)
    .replace("{{HOME_STYLE}}", route.home ? `<style id="home-inline-style">${homeStyle}</style>` : "")
    .replace("{{PRIMARY_NAV}}", renderNavigation(navigation))
    .replace(
      "{{PAGE_CONTENT}}",
      route.home
        ? `<div class="home-content">${getContent(route)}</div>`
        : `<main class="content-shell">${getContent(route)}</main>`,
    );
  fs.writeFileSync(path.join(pageDirectory, "index.html"), page);
}

console.log(
  `Built ${routes.length} static routes in ${path.relative(root, output)}/`,
);
