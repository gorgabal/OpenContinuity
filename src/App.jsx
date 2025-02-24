import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';

let myDocument;

async function databaseSetup() {
  addRxPlugin(RxDBDevModePlugin);
  addRxPlugin(RxDBUpdatePlugin);


  const myDatabase = await createRxDatabase({
    name: 'mydatabase',
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageDexie()
    }),
    ignoreDuplicate: true //FIXME: this should be set to false in production
  });

  await myDatabase.addCollections({
    // name of the collection
    count: {
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
          count: {
            type: 'integer'
          },
        },
        required: ['id', 'count']
      }
    }
  });

  myDocument = await myDatabase.count.insertIfNotExists({ id: '1', count: 0 });


}

function incrementCount() {
  myDocument.incrementalUpdate({
    $inc: {
      count: 1
    }
  })

  console.log(myDocument.getLatest().count);
}

function App() {

  databaseSetup().catch(console.error);

  const [myDocument.count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={incrementCount}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
