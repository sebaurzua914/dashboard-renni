const redis = require('redis');

const client = redis.createClient({
    url: 'redis://default:b6j83vRTYzLGcO9a29z1bPgbhpk7VVTn@redis-15798.c273.us-east-1-2.ec2.redns.redis-cloud.com:15798' // Reemplaza con tu URL de conexión a Redis
});

client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('error', (err) => {
    console.log('Redis Client Error', err);
});

client.connect();

module.exports = client;
