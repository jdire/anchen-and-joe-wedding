# Static asset handoff

The snippets currently reference six story photos, two evening images, and one Q&A image under `websites/AD2903022/images/`. That folder is not present in this workspace, so the build prints a warning until those CMS assets are copied into the project.

Before publishing the Azure build, place the downloaded files at:

```text
websites/AD2903022/images/
```

The three menu images are already public Wix URLs and do not need to be copied for the initial build. For a fully self-contained site, download those three as well and update `menu-snippet.html` to use local paths.