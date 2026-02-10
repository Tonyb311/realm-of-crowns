import { Router } from 'express';
import { adminGuard } from '../../middleware/admin';
import statsRouter from './stats';
import usersRouter from './users';
import charactersRouter from './characters';
import worldRouter from './world';
import economyRouter from './economy';
import toolsRouter from './tools';

const router = Router();

router.use(adminGuard);
router.use('/stats', statsRouter);
router.use('/users', usersRouter);
router.use('/characters', charactersRouter);
router.use('/world', worldRouter);
router.use('/economy', economyRouter);
router.use('/tools', toolsRouter);

export default router;
