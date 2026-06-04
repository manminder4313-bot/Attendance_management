
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://manminder_2002:Maan%404313@ac-26w7ddf-shard-00-00.1htdj3m.mongodb.net:27017,ac-26w7ddf-shard-00-01.1htdj3m.mongodb.net:27017,ac-26w7ddf-shard-00-02.1htdj3m.mongodb.net:27017/userDB?ssl=true&authSource=admin&retryWrites=true&w=majority';

async function dropIndex() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('departments');
    
    console.log('Current indexes:');
    const indexes = await collection.indexes();
    console.log(indexes);
    
    if (indexes.some(i => i.name === 'name_1')) {
      console.log('Dropping index name_1...');
      await collection.dropIndex('name_1');
      console.log('Index dropped successfully');
    } else {
      console.log('Index name_1 not found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

dropIndex();
