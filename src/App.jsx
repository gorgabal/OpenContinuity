import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';

import MainNav from './components/QuickActionSidebar'
import CostumeDetailPage from './pages/CostumeDetailPage'
import SceneOverviewPage from './pages/SceneOverviewPage'
import SceneDetailPage from './pages/SceneDetailPage'
import ShootingDayPage from './pages/ShootingDayPage'
import { Button } from 'flowbite-react';

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

function App() {
  const [count, setCount] = useState(0);
  
  // Run database setup once on component mount
  useEffect(() => {
    databaseSetup()
      .then(() => {
        // Initialize state with database value
        setCount(myDocument.getLatest().count);
        
        // Subscribe to changes
        const subscription = myDocument.$.subscribe(newDoc => {
          setCount(newDoc.count);
        });
        
        return () => subscription.unsubscribe();
      })
      .catch(console.error);
  }, []);

  const handleIncrement = () => {
    myDocument.incrementalUpdate({
      $inc: {
        count: 1
      }
    }).catch(console.error);
  };

  return (
    <div class="layout">
      <div className="layout__main">
        <div className="card">
          <Button onClick={handleIncrement}>
            count is {count}
          </Button>
          <p>
            Edit <code>src/App.jsx</code> and save to test HMR
          </p>
        </div>
        <div>
        </div>
      </div>
    </div>
  )
}

export default App
