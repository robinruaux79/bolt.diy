import fs from 'node:fs'
import express from 'express'
import {MongoClient} from 'mongodb'
import { RateLimiterMongo } from 'rate-limiter-flexible';
import bodyParser from "body-parser";
import cookieParser from "cookie-parser"
import expressSession from "express-session"
import csrfDSC from 'express-csrf-double-submit-cookie'
import process from "node:process";
import { pipeline } from "node:stream/promises";
import MongoStore from 'connect-mongo';

import {createServer} from "vite";
import http from "http";
import { createDataStream, streamText } from 'ai';

// Constants
const isProduction = process.env.NODE_ENV === 'production'
const base = process.env.BASE || '/'

// Connection URL
const dbUrl = process.env.MONGO_DB_URL || 'mongodb://127.0.0.1:27017';
const client = new MongoClient(dbUrl, { maxPoolSize: 20 });

// Database Name
const dbName = 'gen';

console.log('Connected successfully to server');
const db = client.db(dbName);
const eventsCollection = db.collection("events");

const opts = {
  storeClient: Promise.resolve(client),
  dbName: dbName,
  points: 250, // Number of points
  duration: 1, // Per second(s)
};

const rateLimiterMongo = new RateLimiterMongo(opts);

const rateLimiterMiddleware = (req, res, next) => {
  rateLimiterMongo.consume(req.sessionID || req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).send('Too Many Requests');
    });
};

// Use connect method to connect to the server
await client.connect();

// Create http server
const app = express()
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser(isProduction ? 'ergRRà_546bbfg345fer45tyhtbmlke990eref' : 'secret'));
app.use(expressSession({
  store: MongoStore.create({ mongoUrl: dbUrl })
}));
app.use(rateLimiterMiddleware);

const csrfProtection = csrfDSC();
app.use(csrfProtection)
app.disable('etag');

const templateHtml = isProduction
  ? fs.readFileSync('./dist/client/index.html', {encoding:'utf-8'})
  : fs.readFileSync('./index.html', {encoding:'utf-8'})

const ssrManifest = isProduction
  ? fs.readFileSync('./dist/client/.vite/ssr-manifest.json', {encoding:'utf-8'})
  : undefined

// Add Vite or respective production middlewares
let vite
if (!isProduction) {
  const {createServer} = await import('vite')
  vite = await createServer({
    server: {middlewareMode: true},
    appType: 'custom',
    base
  })
  app.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression())
  app.use(base, sirv('./dist/client', {extensions: []}))
}

app.get('/issues', (req, res) => {
  fs.readFile('bugs.txt', (err, data) => {
    try {
      res.json({data: data});
    }catch (e){
      res.json({success: false});
    }
  });
});

app.post('/api/chat', async (req, res) =>{
  const { messages, files, promptId, contextOptimization } = req.body;

  const apiKeys = {
    'Anthropic': '',
    'OpenAI': '',
    'Google': '',
    'Groq': '',
    'HuggingFace': '',
    'OpenRouter': '',
    'Deepseek': '',
    'Mistral': '',
    'OpenAILike': '',
    'Together': '',
    'xAI': '',
    'Perplexity': '',
    'Cohere': '',
    'AzureOpenAI': '',
    'AmazonBedrock': '',
  }

    const result = await streamText({
      messages,
      model: 'gemini-1.5',
      prompt: '',
    });

    res.set('Connection', 'keep-alive');
    res.set('Content-Type', 'text/event-stream');
    await pipeline(result.toDataStream(), res);
/*    return new Response(stream.readable, {
      status: 200,
      headers: {
        contentType: 'text/event-stream',
        connection: 'keep-alive',
      },
    });*/

});

app.get('/', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, "");

    let template;
    let render;
    if (!isProduction) {
      // Always read fresh template in development
      template = fs.readFileSync("./index.html", { encoding: "utf-8" });
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule("/src/entry-server.jsx")).render;
    } else {
      template = templateHtml;
      render = (await import("./dist/server/entry-server.js")).render;
    }

    const rendered = await render(url, ssrManifest);

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? "")
      .replace(`<!--app-html-->`, rendered.html ?? "");

    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    res.status(500).end(e.stack);
  }
})


const port = process.env?.PORT || 7640;
http.createServer(app).listen(port);

process.on('uncaughtException', function (exception) {
  console.error(exception);
  fs.appendFile('bugs.txt', JSON.stringify({ code: exception.code, message: exception.message, stack: exception.stack }), function (err) {
    if (err){
      throw err;
    }
  });
  process.exit(0);
});
