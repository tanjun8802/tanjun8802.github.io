# Updating your portfolio

The editor is a local tool, excluded from the public website. Visitors cannot use it to change your content. Your text, project stories, timeline, captions and profile live in `data.json`.

## Open the editor

1. Open a terminal in the project folder and run `python3 -m http.server 8000`.
2. Open [the content editor](http://localhost:8000/editor.html).
3. Choose a section in the sidebar. Expand an entry to edit its fields.

The editor keeps changes in browser memory until you save. It warns before you leave with unsaved changes; do not rely on the browser to recover edits after a crash. Download a backup during longer writing sessions.

## Text and stories

Edit fields directly. Use the move buttons to reorder entries and **Add entry** to add an item. The first six projects appear in selected work. Keep education and employment milestones newest first. Fill all required fields in a new entry before saving. If you remove every entry from a section, **Add entry** restores the correct form fields so you can start again; required sections must contain a completed entry before validation will pass.

Keep existing **Permanent link IDs** unchanged: shared project links use them. New IDs should be unique lowercase words separated by hyphens, such as `autonomous-rover`. A related project ID must match an entry in Projects.

Use concise summaries on tiles, then develop the context, your contribution and the outcome in story sections. Keep team outcomes distinct from your own contribution. Explain photographs with captions and descriptions.

## Pictures

For any Picture field, select **Choose a new picture**. The editor previews it, assigns a unique filename and remembers the file for your next save. JPEG, PNG, WebP and AVIF images up to 8 MB are supported. Use reasonably compressed images, preferably under 500 KB where practical. Existing pictures are not deleted when replaced.

To add a photograph to a project that currently uses only a diagram, expand the project and choose **Add a picture** at the bottom. Choose **Add a photo gallery** to add further pictures when that field is not already present. The diagram remains a fallback when the image field is empty.

## Save locally

In browsers supporting folder access (such as Chrome and Edge), choose **Save to project folder**, select the folder containing `templates/index.html` and `data.json`, then confirm **Save files**. The editor writes new pictures into `assets/images/` and replaces `data.json`. It checks for outside changes before saving, so another edit is not silently overwritten.

If folder access is unavailable, **Download changes** opens a dialog with separate download links. Select **Download data.json** to download the content file, then select each new picture link. Replace the project's `data.json` and copy the pictures into `assets/images/`. Downloading does not itself change the project files. The editor keeps its unsaved warning until changes have been written through folder access or the page is reloaded.

## Validate, preview and publish

After saving, run `python3 scripts/site.py build` from the project folder. This validates the content and rebuilds the public website into `dist/`. Select **Preview built website** in the editor, or open [the built preview](http://localhost:8000/dist/). Refresh it and check the page, project details, photographs and public CV. Build errors identify content that needs correction, such as a missing picture or invalid project reference.

Commit and push the reviewed changes using your normal GitHub workflow. The editor does not commit, push, publish, change repository settings or call an external service.

## If something goes wrong

- **No content loads:** run the local server from the project root, or import an existing `data.json` using the footer button.
- **Content changed outside the editor:** download a backup, reload the editor and merge your edits into the latest content before saving.
- **Folder save fails:** the draft remains in memory. Download it before closing the tab.
- **Picture is missing:** confirm that the downloaded picture is in `assets/images/` and that its filename matches the Picture field exactly.
