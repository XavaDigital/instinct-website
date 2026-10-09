# How to update images on the Instinct website

A step-by-step guide for adding or replacing photos on instinct.nz. No coding needed: you copy
image files into the right folder, save the change to GitHub, then publish the site.

- **Part 1** is a one-time setup on your computer (about 30 minutes).
- **Part 2** is what you do every time you change images (about 10 minutes).
- **Part 3** covers what to do when something goes wrong.

Nothing you do changes the live website until the very last step of Part 2 (publishing). If you
get stuck or unsure at any point before that, stop and ask David. Nothing will break.

The steps are written for Windows. Mac differences are noted where they matter.

---

## Before you start: what you need from David

1. **An invite to the GitHub project.** You'll get an email from GitHub. Accept it (create a
   free GitHub account first if you don't have one). The project is
   `XavaDigital/instinct-website`.
2. **An invite to the Cloudflare account.** Cloudflare hosts the website. You'll get an email
   from Cloudflare. Accept it (create a free Cloudflare account with that email if asked).

You don't need any passwords or keys beyond your own GitHub and Cloudflare logins.

---

## Part 1: One-time setup

### 1. Install Git

Git is the tool that downloads the project and saves your changes back to GitHub.

1. Go to https://git-scm.com/downloads and download Git for Windows.
2. Run the installer and click **Next** on every screen. The default options are all fine.

*Mac:* open the **Terminal** app, type `git --version` and press Enter. If Git isn't installed,
your Mac offers to install it. Click **Install**.

### 2. Install Node.js

Node.js is the tool that builds the website.

1. Go to https://nodejs.org and download the **LTS** version (it must be version 22 or newer).
2. Run the installer and click **Next** on every screen.

### 3. Install Visual Studio Code (recommended)

VS Code shows the project's folders and has a built-in terminal, so you can do everything in one
window.

1. Go to https://code.visualstudio.com and download it.
2. Run the installer and keep the default options.

### 4. Open a terminal

A terminal is a window where you type commands. Every grey box in this guide is a command:
type it (or copy and paste it) and press **Enter**.

- **Windows:** open the Start menu, type **Terminal**, and open it. (If you don't have
  Terminal, open **PowerShell** instead.)
- **Mac:** open the **Terminal** app (Applications → Utilities).

Check the tools are installed by typing each of these. Each should print a version number:

```
git --version
```

```
node --version
```

The Node number must be `v22.12` or higher. If you see "not recognised" or "command not
found", close the terminal, open a new one and try again. If it still fails, reinstall that
tool.

### 5. Tell Git who you are

Git labels every change with your name. Replace the example name and email with yours (keep the
quote marks):

```
git config --global user.name "Your Name"
```

```
git config --global user.email "you@example.com"
```

### 6. Download the project

1. Move to your Documents folder:

   ```
   cd Documents
   ```

2. Download the project (this is called "cloning"):

   ```
   git clone https://github.com/XavaDigital/instinct-website.git
   ```

   The first time, a window or browser tab asks you to sign in to GitHub. Sign in and click
   **Authorize**. The download then finishes on its own.

3. Move into the project folder:

   ```
   cd instinct-website
   ```

The project is now at `Documents\instinct-website` on your computer.

### 7. Install the project's building blocks

```
npm install
```

This takes a few minutes and prints a lot of text. Yellow "warn" lines are normal. It's done
when you can type again.

### 8. Log in to Cloudflare

```
npx wrangler login
```

A browser tab opens. Log in with the Cloudflare account David invited, then click **Allow**.
Check it worked:

```
npx wrangler whoami
```

It should show your email and the Instinct account.

Setup is finished. You won't need Part 1 again on this computer.

---

## Part 2: Every time you change images

### Step 1. Open the project in a terminal

- **VS Code:** open VS Code, choose **File → Open Folder**, pick `Documents\instinct-website`,
  then choose **Terminal → New Terminal**. The terminal opens already in the project folder.
- **Terminal on its own:** open it and type `cd Documents\instinct-website`
  (Mac: `cd Documents/instinct-website`).

### Step 2. Get the latest version

Always do this first, so you start from the newest copy of the site:

```
git pull
```

It should say "Already up to date" or list some changed files. Either is fine.

### Step 3. Work out each image's filename

The website finds images **by their filename**. A correctly named file in the right folder
appears on the site automatically. A misspelled one is ignored.

- **[IMAGE-GUIDE.md](IMAGE-GUIDE.md)** lists every folder, every filename and what to photograph
  for each.
- To see which filename a spot on the live site uses, add `?slots` to the end of the page
  address, for example https://instinct.nz/?slots. Every image shows a label with its filename.

### Step 4. Prepare the image file

| Rule | What to do |
| --- | --- |
| Name | Lower-case letters, numbers and hyphens only, e.g. `netball-riverside-2026.jpg`. No spaces. (Gallery photos may use capitals for names; see IMAGE-GUIDE.md.) |
| Format | JPG for photos. iPhone photos are often HEIC, which doesn't work. Export or convert them to JPG first. |
| Size | About 2400 pixels on the longest side and under 3 MB. Don't shrink photos smaller than that. |

### Step 5. Copy the image into the right folder

Open the project folder in File Explorer (Mac: Finder) and copy your files into the right
folder:

| Folder | What goes in it |
| --- | --- |
| `src\assets\gallery` | Kit photos for the gallery (as many as you like) |
| `src\assets\site` | The fixed photos on the main pages (homepage hero, etc.) |
| `src\assets\sports` | One photo per sport, plus feature photos |
| `src\assets\garments` | Product photos for each garment |
| `src\assets\logos` | Club and school logos (only with their permission) |

**To replace an existing photo**, give the new file exactly the same name and copy it over the
old one. When Windows asks, choose **Replace the file in the destination**.

**To remove a photo**, delete the file from the folder.

### Step 6. Check it on your computer

Start a private preview of the site:

```
npm run dev
```

Wait until it shows a `http://localhost:4321` address (the first start takes up to a minute).
Open http://localhost:4321/?slots in your browser and check your photos appear where you
expect.

Notes:
- The preview includes some pages that aren't live yet (individual sport and garment pages).
  That's expected.
- When you're done, click in the terminal and press **Ctrl + C** to stop the preview.
  (Mac: **Control + C**.)

### Step 7. Save your change to GitHub

1. See what you changed:

   ```
   git status
   ```

   Your new or replaced image files are listed in red. If you see files you didn't mean to
   change, stop and ask David.

2. Mark the image files to be saved:

   ```
   git add src/assets
   ```

3. Save them with a short description of what you did, written inside the quote marks:

   ```
   git commit -m "Add Riverside netball gallery photos"
   ```

4. Send them to GitHub:

   ```
   git push
   ```

### Step 8. Publish the website

```
npm run deploy:mvp
```

This builds the site and publishes it. It takes a few minutes. When it finishes you'll see a
line mentioning `instinct.nz`. Open https://instinct.nz and press **Ctrl + F5** (Mac:
**Cmd + Shift + R**) to see the new version.

**Always use `npm run deploy:mvp`.** Never run `npm run deploy` on its own: that publishes the
unfinished pages too.

The site is published from the files on your computer, not from GitHub. That's why Step 2
(pull) and Step 7 (push) matter: they keep your copy, GitHub and the live site the same.

---

## Part 3: When something goes wrong

| What you see | What it means | What to do |
| --- | --- | --- |
| `'git' is not recognized` or `command not found` | Git or Node isn't installed, or the terminal was open during the install | Close the terminal, open a new one, try again. If it still fails, reinstall (Part 1). |
| `git pull` says "Your local changes … would be overwritten" | You have changes that aren't saved to GitHub yet | Run `git status` to see them, then ask David. |
| `git push` is rejected and mentions "fetch first" | Someone else saved changes since your last pull | Run `git pull`, then `git push` again. |
| My photo doesn't show up | The filename or folder doesn't match | Check the spelling against IMAGE-GUIDE.md, including `.jpg` vs `.jpeg`, and check it's in the right folder. |
| The preview or publish stops with an error naming an image | The file is damaged or in an unsupported format (often HEIC) | Re-export the photo as a JPG and copy it in again. |
| Publish says you're not logged in or not authorised | Your Cloudflare login has expired or lacks access | Run `npx wrangler login` again. If it still fails, ask David to check your Cloudflare access. |
| Publish says "the output is the FULL site, not the MVP" | A safety check stopped the wrong version going live | Don't retry. Tell David. |
| I committed the wrong file | It's saved on your computer but not yet on GitHub | If you haven't run `git push` yet, ask David. It's easy to undo. If you have pushed, still ask David, and don't publish. |
