import { evalES, evalTS } from "../lib/utils/bolt";
const express = require('express');
const app = express();
import uploadRoutes from './uploadRoutes';
import processRoutes from './processRoutes';

app.use(express.json());
app.use('/upload', uploadRoutes);
app.use('/process', processRoutes);

app.get('/', async (req: any, res: any) => {
    const projectPath = await evalES('app.project.path', true);
    res.json({ projectPath });
});

/*
app.get('/createSequence', async (req: any, res: any) => {
    const sequenceId = await evalTS('createNewSequence', "foo");
    res.json({ sequenceId });
});*/

export const startServer = (port: number) => {
    const server = app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}/`);
    });

    return server;
}