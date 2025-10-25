const express = require('express');
const router = express.Router();
const redisClient = require('./redis');

router.get('/health', async (req, res) => {
  try {
    await redisClient.ping();
    res.status(200).send({ status: 'OK' });
  } catch (error) {
    console.error('Redis health check failed:', error);
    res.status(500).send({ status: 'ERROR' });
  }
});

router.get('/transactions/today', async (req, res) => {
  try {
    const today = req.query.date;// new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const key = `${day}:${month}:${year}:logs`;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;
    const stop = page * limit - 1;

    const transactionType = req.query.type;
    const paymentMethod = req.query.paymentMethod;
    const searchTerm = req.query.search;
    
    let transactions = await redisClient.lRange(key, 0, -1);

    if (!transactions) {
      transactions = [];
    }

    transactions = transactions.map(transaction => JSON.parse(transaction));
    
    // Aplicar filtros ANTES del ordenamiento y paginación
    if (transactionType) {
      transactions = transactions.filter(transaction => transaction.Type === transactionType);
    }

    if (paymentMethod) {
      if (paymentMethod === 'pago_efectivo') {
        // Filtrar por todos los métodos de efectivo (solo los que realmente existen)
        transactions = transactions.filter(transaction => 
          transaction['Payment Method'] === 'dinero_mano' || 
          transaction['Payment Method'] === 'caja_abierta'
        );
      } else if (paymentMethod === 'otros_metodos') {
        // Filtrar por métodos que no sean tarjeta ni efectivo
        transactions = transactions.filter(transaction => 
          transaction['Payment Method'] !== 'pago_tarjeta' &&
          transaction['Payment Method'] !== 'pago_efectivo' &&
          transaction['Payment Method'] !== 'dinero_mano' &&
          transaction['Payment Method'] !== 'caja_abierta'
        );
      } else {
        // Filtrar por método específico (como pago_tarjeta)
        transactions = transactions.filter(transaction => transaction['Payment Method'] === paymentMethod);
      }
    }

    if (searchTerm) {
      transactions = transactions.filter(transaction =>
        Object.values(transaction).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Ordenar por fecha de inicio (más reciente primero)
    transactions.sort((a, b) => new Date(b.Inicio) - new Date(a.Inicio));
    
    // Aplicar paginación después de filtros y ordenamiento
    const totalTransactions = transactions.length;
    transactions = transactions.slice(start, start + (stop - start + 1));

    res.status(200).send(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).send({ error: 'Failed to fetch transactions' });
  }
});

router.get('/transactions/:id', async (req, res) => {
  try {
    const transactionId = req.params.id;
    // Assuming transactionId is in the format DD:MM:YYYY:HH:MM:transaccion:CLIENTE_ID:CAJERO_ID
    const transaction = await redisClient.get(transactionId);

    if (!transaction) {
      return res.status(404).send({ error: 'Transaction not found' });
    }

    res.status(200).send(JSON.parse(transaction));
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).send({ error: 'Failed to fetch transaction' });
  }
});

router.get('/kpis/today', async (req, res) => {
  try {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const key = `${day}:${month}:${year}:logs`;

    let transactions = await redisClient.lRange(key, 0, -1);

    if (!transactions) {
      transactions = [];
    }

    transactions = transactions.map(transaction => JSON.parse(transaction));

    const totalTransactions = transactions.length;

    const normalTransactions = transactions.filter(transaction => transaction.Type === 'normal').length;
    const anomalousTransactions = transactions.filter(transaction => transaction.Type === 'anomalous').length;
    const unknownTransactions = transactions.filter(transaction => transaction.Type === 'unknown').length;

    const normalPercentage = (totalTransactions > 0) ? (normalTransactions / totalTransactions) * 100 : 0;
    const anomalousPercentage = (totalTransactions > 0) ? (anomalousTransactions / totalTransactions) * 100 : 0;
    const unknownPercentage = (totalTransactions > 0) ? (unknownTransactions / totalTransactions) * 100 : 0;

    const pagoTarjeta = transactions.filter(transaction => transaction['Payment Method'] === 'pago_tarjeta').length;
    const pagoEfectivo = transactions.filter(transaction => 
        transaction['Payment Method'] === 'pago_efectivo' || 
        transaction['Payment Method'] === 'dinero_mano' || 
        transaction['Payment Method'] === 'caja_abierta'
    ).length;
    const otrosMetodos = totalTransactions - pagoTarjeta - pagoEfectivo;

    const kpis = {
      totalTransactions,
      transactionTypes: {
        normal: {
          count: normalTransactions,
          percentage: normalPercentage
        },
        anomalous: {
          count: anomalousTransactions,
          percentage: anomalousPercentage
        },
        unknown: {
          count: unknownTransactions,
          percentage: unknownPercentage
        }
      },
      paymentMethods: {
        pago_tarjeta: pagoTarjeta,
        pago_efectivo: pagoEfectivo,
        otros_metodos: otrosMetodos
      }
    };

    res.status(200).send(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).send({ error: 'Failed to fetch KPIs' });
  }
});

module.exports = router;