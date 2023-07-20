import { Request, Response } from 'express';
import { FileResult } from 'tmp-promise';
const tmp = require('tmp-promise');
const express = require('express');
import { fs, path } from '../lib/cep/node';
import { csi, evalTS, posix } from '../lib/utils/bolt';

const router = express.Router();

router.post('/:sequenceid/reframe', async (req: Request, res: Response) => {
    const sequenceID = req.params.sequenceid;
    const result = await evalTS('applyCutsAndReframe', sequenceID);
    if (!result?.success) {
        res.status(500).json({ error: 'Failed to apply cuts and reframe.' });
        return;
    } else {
        res.json({ success: true });
    }
});

router.post('/:sequenceid/settings', async (req: Request, res: Response) => {
    // get settings from json payload
    const sequenceID = req.params.sequenceid;
    const {settings} = req.body;
    const result = await evalTS('applySequenceSettings', { settings, sequence: sequenceID });
    if (!result?.success) {
        res.status(500).json({ error: 'Failed to apply sequence settings.' });
        return;
    } else {
        res.json({ success: true });
    }
});

router.get('/:sequenceid/export', async (req: Request, res: Response) => {
    const sequenceID = req.params.sequenceid;
    // get tmp.file
    const { path: tmpPath, cleanup } = await tmp.file({ postfix: '.mp4' });
    const presetPath = path.resolve(csi.getSystemPath('extension'), 'presets/good_mp4.epr');
    const result = await evalTS('exportSequence', tmpPath, presetPath, { sequence: sequenceID });
    if (!result?.success) {
        res.status(500).json({ error: 'Failed to export sequence.' });
        return;
    } else {
        res.sendFile(tmpPath);
    }
});

export default router;