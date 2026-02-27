# Corgi Text Summarizer
Corgi allows you to:
- Copy input text
- Clear text
- Summarize input text
- Set summary length

# Where's Corgi?
https://worker.textsummarizer.workers.dev 

(it will not work since I removed the Anthropic API key from the worker to save $$$ lol)

# Implementation
- Finalize features supported (copy, clear, option to change summary length etc.)
- Design the system (user <--> frontend <--> backend <--> Claude)
- Implement user interface (credit: scrimba)
- Get Anthropic API Key
- Use Anthropic Messages API to talk to Claude and display summary back to user
- Deploy to Cloudflare: To create Cloudflare worker:
    - `npm create cloudflare@latest worker`
    - `cd worker`
    - `npm run deploy`
    - `npx wrangler secret put ANTHROPIC_API_KEY`


# Learnings from this project
Being fairly new to full-stack development, this served as a great intro project.

## 1. Understanding how Cloudflare Workers serve static assets
The initial code provided by Scrimba didn't include handling POST requests separately. As a result, I kept hitting 405 error when I clicked the Summarize button. As I debugging this error, I learnt the following:
- When we deploy a worker with static assets (public folder), Cloudflare sets up two things: worker script and an asset server. The asset server is what serves HTML, CSS, JS files etc. 
- When a request comes in, worker handles it first and for anything it doesn't explicitly handle it passes it along to `env.ASSETS.fetch(request).` As a result, I added it at the bottom of the fetch handler as a fallback. Any request that isn't OPTIONS or POST /summarize (like GET /, GET /index.css, GET /index.js) will return undefined
- By routing POST to /summarize, worker now has a dedicated path to intercept before it ever reaches the asset server. The flow now looks like this:

    * GET / → Worker passes to asset server → serves index.html ✅
    * GET /index.css → Worker passes to asset server → serves the CSS ✅
    * POST /summarize → Worker intercepts it, calls Anthropic, returns summary ✅

I learnt that this is a common pattern for Cloudflare Workers — using a single Worker to serve both a static frontend and an API backend, with the API living under a distinct path like /api/... or /summarize.

## 2. Understanding call flow in full stack apps
I noticed we have fetch calls index.js and worker.js. I dug deeper to understand how this flow actually works and learnt the following:

* __The first fetch__ in `public/index.js`:
This runs in the browser on your computer. When we click Summarize, the browser makes a POST request to the worker at /summarize. This is the one we see in the Network tab.
* __The second fetch__ in `src/worker.js`:
This runs on Cloudflare's servers (the cloud). When worker receives the POST, it turns around and makes its own separate fetch call to Anthropic's API at api.anthropic.com. This happens entirely on the server side — browser never sees it, which is why it doesn't appear in the Network tab.

So the flow is:

```
Browser → (fetch #1) → Cloudflare Worker → (fetch #2) → Anthropic API
                                          
                                          ← summary ←
         ← summary ← 
```

And the reason we need this two-step approach is security. If we called Anthropic directly from the browser, your ANTHROPIC_API_KEY would be exposed in the frontend code for anyone to steal and use. By routing through worker, the API key stays secret on the server and the browser never sees it. From this, I learnt that backend-as-a-proxy pattern is extremely common in full stack apps.