/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
	async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders })
        }

        // Only handle POST to /summarize, let everything else go to static assets
        if (request.method === 'POST' && new URL(request.url).pathname === '/summarize') {
            try {
                const messages = await request.json()
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': env.ANTHROPIC_API_KEY,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-opus-4-6',
                        max_tokens: 300,
                        system: 'You are a text summarizer. When asked to summarize a text, send back the summary of it. Please only send back the summary without prefixing it with things like "Summary" or telling where the text is from. Also give me the summary as if the original author wrote it and without using a third person voice.',
                        messages: messages
                    })
                })
                const data = await response.json()
                return new Response(JSON.stringify({ summary: data.content[0].text }), { headers: corsHeaders })
            } catch (error) {
                 return new Response(JSON.stringify({ error: error}), { status: 500, headers: corsHeaders })
            }
        }
	},
};
