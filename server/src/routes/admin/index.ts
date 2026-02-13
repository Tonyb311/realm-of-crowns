import { Router } from 'express';
import { adminGuard } from '../../middleware/admin';
import statsRouter from './stats';
import usersRouter from './users';
import charactersRouter from './characters';
import worldRouter from './world';
import economyRouter from './economy';
import toolsRouter from './tools';
import errorLogsRouter from './errorLogs';
import simulationRouter from './simulation';
import contentReleaseRouter from './contentRelease';
import travelRouter from './travel';
import populationRouter from './population';
import monstersRouter from './monsters';

const router = Router();

router.use(adminGuard);
router.use('/stats', statsRouter);
router.use('/users', usersRouter);
router.use('/characters', charactersRouter);
router.use('/world', worldRouter);
router.use('/economy', economyRouter);
router.use('/tools', toolsRouter);
router.use('/error-logs', errorLogsRouter);
router.use('/simulation', simulationRouter);
router.use('/content-release', contentReleaseRouter);
router.use('/travel', travelRouter);
router.use('/population', populationRouter);
router.use('/monsters', monstersRouter);

export default router;
