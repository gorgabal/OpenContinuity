/* current objective: 
 * set up a rxdb database
 * present a textboxt to the user
 * save content of textbox to database 
 * 
 * then I can start designing the app, after that I can implement server syncing etc. 
 */

import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';


addRxPlugin(RxDBDevModePlugin);


const myDatabase = await createRxDatabase({
  name: 'mydatabase',
    storage: wrappedValidateAjvStorage({
    storage: getRxStorageDexie()
  })
});

await myDatabase.addCollections({
    // name of the collection
    todos: {
        // we use the JSON-schema standard
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 100 // <- the primary key must have maxLength
                },
                name: {
                    type: 'string'
                },
                done: {
                    type: 'boolean'
                },
                timestamp: {
                    type: 'string',
                    format: 'date-time'
                }
            },
            required: ['id', 'name', 'done', 'timestamp']
        }
    }
});

const myDocument = await myDatabase.todos.insert({
    id: 'todo1',
    name: 'Learn RxDB',
    done: false,
    timestamp: new Date().toISOString()
});

const foundDocuments = await myDatabase.todos.find({
    selector: {
        done: {
            $eq: false
        }
    }
}).exec();

const firstDocument = foundDocuments[0];
await firstDocument.patch({
    done: true
});

await firstDocument.remove();

const observable = myDatabase.todos.find({
    selector: {
        done: {
            $eq: false
        }
    }
}).$ // get the observable via RxQuery.$;
observable.subscribe(notDoneDocs => {
    console.log('Currently have ' + notDoneDocs.length + ' things to do');
    // -> here you would re-render your app to show the updated document list
});

myDocument.done$.subscribe(isDone => {
    console.log('done: ' + isDone);
});

// // hello world node js
// const { createServer } = require('node:http');

// const hostname = '127.0.0.1';
// const port = 3000;

// const server = createServer((req, res) => {
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'text/plain');
//   res.end('Hello World');
// });

// server.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`);
// });
