# IRCC Monitor Pro - Vercel Deployment Guide

This project is optimized for deployment on [Vercel](https://vercel.com).

## Prerequisites

- A Vercel account.
- [Vercel CLI](https://vercel.com/download) (optional, for command-line deployment).

## Deployment Steps

1. **Push to GitHub/GitLab/Bitbucket**: Connect your repository to Vercel.
2. **Environment Variables**: In the Vercel dashboard, add the following environment variable:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
3. **Build Settings**: Vercel should automatically detect the Vite configuration:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Deploy**: Click "Deploy".

## Configuration Details

- `vercel.json`: Handles Single Page Application (SPA) routing by rewriting all requests to `index.html`. This ensures that deep links and page refreshes work correctly.
