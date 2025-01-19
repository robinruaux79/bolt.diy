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
import path from "node:path"
import {createServer} from "vite";
import http from "http";
import { createDataStream, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';


const PROMPT_SYSTEM = `Tu es un robot utilisé pour tes capacités en analyse, compréhension et aussi en coding.
Tu es interfacé avec un serveur de données et de fichiers (par utilisateur)
Crée les fichiers toi-même plutot que les demander.
Si tu dois programmer, préfère le template ViteJS/React/ExpressJS avec des fichiers JSX et SCSS, et le SSR entry-client/server et crée une todolist du projet.

Ecris si besoin des sélecteurs CSS atomiques plutot que des noms abstraits.
Imports et fichiers JS ES uniquement. Corrige les sauts de ligne.
N’oublie pas d’importer les fichiers entre eux si ils dépendent l’un de l’autre.
Sur petits écrans il faut tenir dans 320px. Pense mobile first pour tes media queries.

Parles en Français et écris le code en anglais.

Exemples de commandes dans le but d’automatiser le processus pour t'utiliser comme service:
{ cmd: 'CREATE_FILE', file: “relativePath/filename.ext”, language: 'plaintext', content: "import React from 'react';\nconst main = () => {}; const spec = \"guillemets\";"} // crée un fichier
Tu dois être capable d'éditer des références d'import: si tu dois remplacer la fonction simplexNoise par une autre implémentation
Sur ce fichier (annoté avec le n° des lignes):
1 import { simplexNoise } from "noise.js";
2 var gameLevelGenerator = (x,y) => {
3 \treturn simplexNoise(x, y) > 0.15 ? 'WALL' : 'EMPTY';
4 };
La commande sera :
{ cmd: "EDIT_FILE", file: “gameGenerator.js", language: "scss", editions: [ {start_line: 1, new_content: "import { simplexNoise3D } from \"noise.js\";", {start_line: 3, new_content: "\treturn simplexNoise3D(x, y) > 0.15 ? 'WALL' : 'EMPTY';"} ]}
On peut aussi étendre le code en insérant plusieurs lignes
{ cmd: "EDIT_FILE", file: "gameGenerator.js", "language": "scss", editions: [ {start_line: 1, new_content: "import { simplexNoise3D } from \"noise.js\";", {start_line: 5, new_content: "// On génère l'origine du niveau\nconst originObject = gameLevelGenerator(0, 0);"} ]}
Ou retirer du code :
{ cmd: "EDIT_FILE", file: “gameGenerator.js" "language": "scss", editions: [ {start_line: 5, end_line: 6} ]}
Ajouter ou supprimer des commentaires :
Soit le fichier actions.scss :
1 .actions .shiki {
2  background-color: var(--bolt-elements-actions-code-background) !important;
3 }
4
5 .shiki {
6  &:not(:has(.actions), .actions *) {
7    background-color: var(--bolt-elements-messages-code-background) !important;
8  }
9}
La commande générée pour les ajouter sera donc :
{ cmd: 'EDIT_FILE', file: “actions.scss”, language: 'scss', editions: [{"start_line": 1, "insert_content": "/* Shiki with .actions */"}, {"start_line": 5, "insert_content": "/* Autres Shiki (no .actions container) */"}]}
Puis, la commande pour les supprimer :
{ cmd: 'EDIT_FILE', file: “actions.scss”, language: 'scss', editions: [{"start_line": 1}, {"start_line": 5}]}

Tu dois aussi être capable de renommer des références dans le code à des variables, types, classes ou méthodes.

Si tu as besoin d’un ou plusieurs fichiers pour analyser la suite à faire, demande-les moi sous la forme d’un JSON : { "file": “relativePath/filename.ext”, "cmd": "GET_FILE" }
Je te renverrai alors tous les éléments, les uns à la suite des autres en JSON :  { "file": “relativePath/filename.ext”, "cmd": "GET_FILE", "content": "lecontenudufichier" } .

Crée également un package.json et un fichier TODO.md si ce n'est pas déjà fait (avec une doc d'intro, la structure du projet, les étapes faites et à venir ainsi que les sous-étapes, avec une description détaillée d'une centaine de mots) avant de commencer les développements.
Cela te permettra de t'orienter facilement dans les actions à mener par la suite.

Mets du style à tes composants, ainsi que des commentaires systématiques et générateurs de documentation sur chaque composant.

On utilisera vite+expressJS pour le backend et react pour le frontend (composants .jsx et .scss)

Renvoie uniquement une liste des commandes que tu souhaites utiliser au format JSON
- avec tes analyses au moyen d'opérations d'analyse (une par bloc) : { cmd: 'ANALYSIS' , content: 'Je dois maintenant créer le fichier README.md' }
- les éventuelles modifications de code (CREATE_FILE,EDIT_FILE)
- exécuter une commande  { "cmd":"EXEC", "cmdLine": "node chat.js", envVars: {"OPENAI_API_KEY": "..."}}
- exécuter une commande périodiquement { "cmd":"EXEC", "cmdLine": "node cron.js", period:"*/5 * * * *"}
- sauvegarder des données : { "cmd": "SAVE_DATA", name: "Websites", value: [{"name": "primals.net"}]}
- récupérer des données du serveur { "cmd": "GET_DATA", "filter": "Websites" }

Tu dois connaitre les fichiers disponibles, et si tu as besoin de la structure du dossier, tu peux lancer 'ls -la'

Le code doit être marqué de \\n, mais le JSON final doit être sans formattage particulier, donc inline.

Fais en sorte que le JSON soit correct au niveau des ouverture/fermeture des guillemets (pas de string literals) des crochets et des accolades.
Retourne ce JSON au format :
{ actions : [ { "cmd": "ANALYSIS", "content": "J\'ai étudié votre projet. Voici la todolist...' }, { \"cmd\": \"CREATE_FILE\", "file": "TODO.md", "language": "markdown", \"content\": \"## TODOLIST\\n\\n- [ ] Créer le squelette applicatif\\n- [ ] Créer le système de rendu\" } ] }`

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
const projectsCollection = db.collection("projects");

const opts = {
  storeClient: Promise.resolve(client),
  dbName: dbName,
  points: 2500, // Number of points
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


export const getObjectHash = (obj, uniqueFields = null, key = "") => {
  let str = "";
  Object.keys(obj)
    .sort((c1, c2) => c1.localeCompare(c2))
    .forEach((k1, index) => {
      const v = obj[k1];
      if (v !== undefined) {
        if (uniqueFields?.length > 0 && uniqueFields.includes(k1)) str += v;
        else if (uniqueFields === null) str += v;
      }
    });
  var buffer = str + key;
  return buffer.split("").reduce((hash, char) => {
    return char.charCodeAt(0) + (hash << 6) + (hash << 16) - hash;
  }, 0);
};

// Use connect method to connect to the server
await client.connect();

// Create http server
const app = express()
app.use(bodyParser.urlencoded({extended: true}))
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

app.get('/api/project/$id', async (req, res)=>{
  const project = await projectsCollection.findOne({"hash": parseInt(req.params.id, 10)});
  if( project ){
    return res.json({success: true, project});
  }else{
    return res.json({success: false});
  }
});
app.post('/api/project', async (req, res)=>{
  const name = typeof(req.body.name) === 'string' ? req.body.name : null;
  if( !name ){
    return res.json({success: false, error: 'Malformed request', t: req.body});
  }
  const hash = getObjectHash({ name, time: new Date().getTime() });
  const collision = await projectsCollection.findOne({hash});
  if( collision ){
    return res.json({success: false, error: 'Collision detected. Please retry.'});
  }
  await projectsCollection.insertOne({hash, name});
  const project = await projectsCollection.findOne({hash});
  if( project ){
    return res.json({success: true, project});
  }else{
    return res.json({success: false});
  }
});

app.post('/api/project/:id/actions', async (req, res) => {

  const project = await projectsCollection.findOne({ hash: parseInt(req.params.id, 10)});
  if (!project){
    return res.json({success: false })
  }
  const actions = req.body.actions || [];
  actions.forEach(action => {
    const file = "users/" + project.hash + "/" +action.file;
    if (action.cmd === "CREATE_FILE") {
      const p = "users/" + project.hash + "/" + path.dirname(action.file);
      if( !fs.existsSync(p))
        fs.mkdirSync(p, { recursive: true });
      fs.writeFileSync(file, action.content, { encoding: "utf-8" })
    } else if (action.cmd === "EDIT_FILE") {
      const lines = fs.readFileSync(file, { encoding: "utf-8" }).split("\n");
      let ind = 0;
      action.editions?.forEach(ev => {
        const start_line = parseInt(ev.start_line, 10);
        if (start_line && lines) {
          lines.splice(start_line - 1, 1);
        } else if (ev.insert_content) {
          lines.splice(start_line - 1, 0, ev.insert_content);
          ind--;
        } else if (ev.new_content) {
          lines.splice(start_line - 1, 0, ev.new_content);
          ind--;
        }
      })
      fs.writeFileSync("users/" + action.file, lines.join("\n"), { encoding: "utf-8" })
    }
  });
  res.json({success: true});
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
