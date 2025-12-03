import { Router } from 'express';

const router = Router();

// Simplified templates - return empty for now
// In production, you would import from types/templates.ts
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        templates: [],
        count: 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    res.status(404).json({
      success: false,
      error: 'Template not found',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

