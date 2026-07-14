import { getDatabase } from './mongodb';

export async function getData() {
  try {
    const db = await getDatabase();
    const users = await db.collection('users').find({}).toArray();
    const uploads = await db.collection('uploads').find({}).toArray();
    
    // Map _id back to id for compatibility with existing code
    const mappedUsers = users.map(u => ({
      ...u,
      id: u._id?.toString() || u.id
    }));
    const mappedUploads = uploads.map(u => ({
      ...u,
      id: u._id?.toString() || u.id
    }));

    return { users: mappedUsers, uploads: mappedUploads };
  } catch (error) {
    console.error('Error fetching data from MongoDB', error);
    return { users: [], uploads: [] };
  }
}

export async function saveData(data) {
  try {
    const db = await getDatabase();
    
    if (data.uploads) {
      for (const upload of data.uploads) {
        const id = upload.id || upload.timestamp || new Date().toISOString();
        await db.collection('uploads').updateOne(
          { _id: id },
          {
            $set: {
              userId: upload.userId,
              timestamp: upload.timestamp ? new Date(upload.timestamp) : new Date(),
              source: upload.source,
              ocrConfidence: upload.ocrConfidence,
              extractionMethod: upload.extractionMethod,
              data: upload.data,
              validation: upload.validation
            }
          },
          { upsert: true }
        );
      }
    }

    if (data.users) {
      for (const user of data.users) {
        const id = user.id;
        if (!id) continue;
        await db.collection('users').updateOne(
          { _id: id },
          {
            $set: {
              name: user.name,
              email: user.email?.toLowerCase().trim(),
              password: user.password,
              createdAt: user.createdAt || new Date().toISOString()
            }
          },
          { upsert: true }
        );
      }
    }
  } catch (error) {
    console.error('Error saving data to MongoDB', error);
  }
}

export async function findUserByEmail(email) {
  if (!email) return null;
  const emailClean = email.toLowerCase().trim();
  try {
    const db = await getDatabase();
    const user = await db.collection('users').findOne({ email: emailClean });
    if (user) {
      return {
        ...user,
        id: user._id?.toString() || user.id
      };
    }
    return null;
  } catch (error) {
    console.error('Error finding user by email', error);
    return null;
  }
}

export async function createUser({ name, email, password }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  const emailClean = email.toLowerCase().trim();
  const db = await getDatabase();
  
  const existing = await db.collection('users').findOne({ email: emailClean });
  if (existing) {
    throw new Error('User already exists');
  }

  const id = Date.now().toString();
  const newUser = {
    _id: id,
    id,
    name,
    email: emailClean,
    password,
    createdAt: new Date().toISOString()
  };

  await db.collection('users').insertOne(newUser);
  return newUser;
}
