# Yuki Upload To Unlock

Create a page with a file upload section and a gated download link.

Requirements:

1. UI: Create a single page with a FileInput (drag-and-drop or click to upload) and a "Submit" button. Initially, show a disabled "Download File" button or a message saying "Upload a file to unlock the download."

2. Upload Action: When a user selects a file and clicks Submit, upload the file to a private Supabase Storage bucket named `user-uploads`. Save a record of this upload in a database table (e.g., `file_unlocks` with columns `id`, `user_id`, `file_path`, `created_at`).

3. Unlock Logic: After the upload is successful and the database record is created, enable the "Download File" button.

4. Download Link: When the "Download File" button is clicked, generate a temporary signed URL (valid for 1 hour) from the private `user-uploads` bucket and trigger the download. Do not expose the raw file URL in the client code.

5. Privacy: Ensure the `user-uploads` bucket is private (no public read access). The download link must only be accessible to the user who uploaded the file, enforced by Row Level Security (RLS) policies on the storage and database.

here is the download link and the name of mobile app is Yuki  https://u.pcloud.link/publink/show?code=XZE7rfJZ5yXpq5zCBNziuJmyrqGj0jJ2wqq7

The download button should open the Yuki pCloud link after a successful upload. The upload-gated page is called Yuki and should use the provided anime icon as the brand mark.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://yuki-upload-to-unlock.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5fd288be-20d2-4d98-bec6-9b6e54f6391c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
