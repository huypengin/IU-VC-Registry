import { Router } from 'express';
import { subjectService } from '../services/subject-service';

const subjectRouter = Router();
const featureFlagEnabled = process.env.FEATURE_SUBJECT_TEMPLATES === 'true';

if (featureFlagEnabled) {
  subjectRouter.get('/subjects/templates', async (_req, res) => {
    const templates = await subjectService.listTemplates();
    res.json({ templates });
  });

  subjectRouter.get('/subjects/templates/:id', async (req, res) => {
    const template = await subjectService.getTemplate(req.params.id);
    if (!template) {
      res.status(404).json({ message: 'Subject template not found' });
      return;
    }

    res.json({ template });
  });
} else {
  subjectRouter.use('/subjects/templates', (_req, res) => {
    res.status(404).json({ message: 'Subject templates feature is disabled' });
  });
}

export default subjectRouter;
