import { Router, Request, Response } from 'express';
import { authService } from './auth.service';

const router: Router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const token = await authService.login(username, password);

    if (!token) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
