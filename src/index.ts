import express from 'express';
import cors from 'cors';
import commitRoutes from './routes/commits';
import chainsRoutes from './routes/chains';
import templateRoutes from './routes/templates';
import discoveryRoutes from './routes/discovery';
import { config } from './config';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/commits', commitRoutes);
app.use('/api/chains', chainsRoutes);
app.use('/api/templates', templateRoutes);
app.use('/.well-known', discoveryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(config.port, () => {
  console.log(`🚀 Identity Bridge Relay running on port ${config.port}`);
  console.log(`📍 Default Origin Chain: ${config.defaultOriginChainId}`);
  console.log(`📍 Default Dest Chain: ${config.defaultDestChainId}`);
});

