const redis = require('redis');

const client = redis.createClient({
    url: '' // Reemplaza con tu URL de conexión a Redis
});

client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('error', (err) => {
    console.log('Redis Client Error', err);
});

client.connect();

module.exports = client;
