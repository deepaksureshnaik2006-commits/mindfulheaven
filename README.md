# Mindful Heaven - Mental Health Support Community

A web app for mental health support, where people can connect and find help.

## Tools We're Using

React - For building the website interface
Vite - For quick development and testing
TypeScript - Helps catch code mistakes early
Tailwind CSS - Makes the website look nice
Supabase - Stores user data and handles login
React Router - Helps navigate between pages

## Getting Started

First, install Node.js from nodejs.org (pick the LTS version). That's all you need.

Open your terminal and run:

```bash
npm install

npm run dev
```

The first command downloads everything your project needs. The second command starts the development server. Open your browser and the website will be running.

## Where Are the Important Files?

src/components - Buttons, cards, all the UI stuff
src/pages - Different pages of the website
src/main.tsx - The starting point of the app

## Commands You'll Need

```bash
npm run dev     - Start working on the website
npm run build   - Make it ready to upload
npm run lint    - Check for code errors
npm run test    - Run tests
```

## How to Upload Your Website

When you're done making changes:

```bash
npm run build
```

This creates a dist folder. Take this folder and upload it to Vercel or Netlify. That's it.

## Common Problems and How to Fix Them

Problem: Getting an error about port
Answer: Something else is using the same port. Try running `npm run dev -- --port 3000`

Problem: Changes aren't showing up
Answer: Make sure you saved the file and refresh your browser

Problem: npm install doesn't work
Answer: Make sure you have Node.js installed first. Check by typing `node -v` in terminal
