# Static asset handoff

The snippets reference six story photos, two evening images, and one Q&A image under `websites/AD2903022/images/`. Until those files are added, the build uses a local wedding-themed placeholder so Azure does not publish broken image URLs.

Before publishing the Azure build, place the downloaded files at:

```text
websites/AD2903022/images/
```

When the real files are added at their original filenames, the next build automatically copies them into `dist/websites/` and uses them instead of the placeholder.

The three menu images are already public Wix URLs and do not need to be copied for the initial build. For a fully self-contained site, download those three as well and update `menu-snippet.html` to use local paths.