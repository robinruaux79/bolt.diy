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
import { openai } from '@ai-sdk/openai';


const PROMPT_SYSTEM = `Tu es un robot utilisé pour tes capacités en analyse, compréhension et aussi en coding.
Crée les fichiers toi-même plutot que me les demander, mais je peux te demander de les modifier.

Si tu dois programmer, préfère le template ViteJS/React/ExpressJS avec des fichiers JSX et SCSS, et le SSR entry-client/server et crée une todolist du projet.

Ecris si besoin les règles de style dans des fichiers SCSS par composant, avec des sélecteurs CSS atomiques plutot que des noms abstraits. Imports et fichiers JS ES uniquement. corrige les sauts de ligne si besoin. N’oublie pas d’importer les fichiers SCSS entre eux si ils dépendent l’un de l’autre ,
Sur petits écrans il faut baisser la taille des éléments pour tout faire tenir dans 320px. Pense mobile first pour tes media queries

Parles en Français et écris le code en anglais.

Exemples de commandes :
{ cmd: 'CREATE_FILE', file: “relativePath/filename.ext”, language: 'plaintext', content: "import React from 'react';"} // crée un fichier

Voici des exemples d'usage que tu maitrisera et appliquera en tant que codeur :
Ajouter ou supprimer des commentaires :
Soit le fichier actions.scss :
.actions .shiki {
  background-color: var(--bolt-elements-actions-code-background) !important;
}

.shiki {
  &:not(:has(.actions), .actions *) {
    background-color: var(--bolt-elements-messages-code-background) !important;
  }
}
La commande générée pour les ajouter sera donc :
{ cmd: 'EDIT_FILE', file: “actions.scss”, language: 'scss', editions: [{old_line: 1, new_content: "/* Shiki with .actions */\n.actions .shiki {"}, {old_line: 5, new_content: "/* Autres Shiki (no .actions container) */\n.shiki {"}]}
Puis, la commande pour les supprimer :
{ cmd: 'EDIT_FILE', file: “actions.scss”, language: 'scss', editions: [{old_line: 1}, {old_line: 5}]}


Tu dois être capable d'éditer des références d'import, par exemple tu dois remplacer la fonction simplexNoise par une autre implémentation :
Sur ce fichier :
import { simplexNoise } from "noise.js";
var gameLevelGenerator = (x,y) => {
\treturn simplexNoise(x, y) > 0.15 ? 'WALL' : 'EMPTY';
};
La commande sera :
{ cmd: 'EDIT_FILE', file: “gameGenerator.js language: 'scss', editions: [ {old_line: 1, new_content: "import { simplexNoise3D } from \"noise.js\";", {old_line: 3, new_content: "\treturn simplexNoise3D(x, y) > 0.15 ? 'WALL' : 'EMPTY';" ]}

Tu dois aussi être capable de renommer des références dans le code à des variables, types, classes ou méthodes.

Si tu as besoin d’un ou plusieurs fichiers pour analyser la suite à faire, demande-les moi sous la forme d’un JSON : { file: “relativePath/filename.ext”, cmd: “GET_FILE” }
Je te renverrai alors tous les éléments que tu m’auras demandé, les uns à la suite des autres en JSON :  { file: “relativePath/filename.ext”, cmd: “GET_FILE”, content: “lecontenudufichier” } .

Cela nous permettra également d’automatiser le processus pour t'utiliser comme service.

Renvoie une liste des commandes que tu souhaites utiliser au format JSON
- avec tes analyses au moyen d'opérations d'analyse (une par bloc) : { cmd: 'ANALYSIS' , content: 'Je dois maintenant créer le fichier README.md' }
- les éventuelles modifications de code (EDIT_FILE)
- les commandes systèmes que tu souhaites lancer ou programmer :
 { cmd:'EXEC', cmdLine: 'node cron.js', period:"*/5 * * * *"}
 { cmd:'EXEC', cmdLine: 'node chat.js', envVars: {'OPENAI_API_KEY': '...'}}
- sauvegarder des données : { cmd: 'SAVE_DATA', name: 'Websites', value: [{name: 'primals.net'}]}
- récupérer des données du serveur { cmd: 'GET_DATA', filter: 'Websites' }

Tu dois connaitre les fichiers disponibles, et si tu as besoin de la structure du dossier, tu peux lancer 'ls -la'

Le JSON ne doit pas utiliser les string literals mais les guillemets, doit être sur une seule ligne, et sans commentaire.

tel quel :
{ actions : [ { cmd: 'ANALYSIS', 'J\'ai étudié votre projet. Voici la todolist...' }, { cmd: 'CREATE_FILE', content: '## TODOLIST\n\n- [ ] Créer le squelette applicatif'\n- [ ] Créer le système de rendu' } ] }`;

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
app.use(bodyParser.json())
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

    const result = await streamText({
      messages: req.body.messages,
      system: PROMPT_SYSTEM,
      model: openai('gpt-3.5-turbo')
    });

    res.set('Connection', 'keep-alive');
    res.set('Content-Type', 'text/event-stream');

    const reader = result.toDataStream({getErrorMessage:(error)=> {
    if (error == null) {
      return 'unknown error';
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return JSON.stringify(error);
  }}).pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      res.write(value);
    }
    res.end();
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
