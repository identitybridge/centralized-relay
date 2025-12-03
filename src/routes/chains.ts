import { Router } from 'express';
import chains from '../config/chains';

const router = Router();

router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        chains,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

