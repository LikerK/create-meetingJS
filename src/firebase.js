import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import "dotenv/config";


const firebaseConfig = {
  databaseURL: process.env.DATABASE_URL,
};

const app = initializeApp(firebaseConfig);


// Initialize Realtime Database and get a reference to the service
const database = getDatabase(app);

export default database;
