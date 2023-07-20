const setComponentProperty = (clip: TrackItem, componentName: string, propertyName: string, value: string | number, updateUI: boolean) => {
    let components = getComponents(clip);
    let prop: ComponentParam | null = components[componentName].properties.getParamForDisplayName(propertyName);

    prop?.setValue(value, updateUI);
}

const getComponentProperty = (clip: TrackItem, componentName: string, propertyName: string) => {
    const components = getComponents(clip);
    let prop = components[componentName].properties.getParamForDisplayName(propertyName);
    return prop?.getValue();
}

const getMotionProperty = (clip: TrackItem, propertyName: string) => {
    return getComponentProperty(clip, 'Motion', propertyName);
}

function setMotionProperty(clip: TrackItem, propertyName: string, value: string | number, updateUI?: boolean) {
    setComponentProperty(clip, 'Motion', propertyName, value, !!updateUI);
}

const getComponents = (clip: TrackItem) => {
    let components: { [key: string]: Component } = {};
    for (let i = 0; i < clip.components.numItems; i++) {
        let component = clip.components[i];
        components[component.displayName] = component;
    };
    return components;
}

const isMGTClip = (clip: TrackItem) => {
    for (let i = 0; i < clip.components.length; i++) {
        if (clip.components[i].displayName === 'Graphic Parameters') {
            return true;
        }
    }
    return false;
}

function assign(target: any, ...sources: any[]): any {
    if (target == null) {
        throw new Error('Cannot convert undefined or null to object');
    }

    const output = Object(target);

    for (const source of sources) {
        if (source != null) {
            for (const key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    output[key] = source[key];
                }
            }
        }
    }

    return output;
}



export const applySequenceSettings = ({ sequence, settings, smartScale }: { sequence?: Sequence|string, settings: any, smartScale?: boolean }) => {
    if (typeof sequence === 'string') {
        sequence = getSequenceById(sequence);
        if (!sequence) return;
    }
    sequence = sequence || app.project.activeSequence;
    let origSettings = sequence.getSettings();
    if (smartScale && typeof settings.videoFrameHeight !== 'undefined') {
        for (let i = 0; i < sequence.videoTracks.numTracks; i++) {
            const track = sequence.videoTracks[i];
            for (let j = 0; j < track.clips.numItems; j++) {
                const clip = track.clips[j];
                if (isMGTClip(clip)) continue;
                const currentScale = getMotionProperty(clip, 'Scale');
                const newScale = currentScale * settings.videoFrameHeight / sequence.frameSizeVertical;
                setMotionProperty(clip, 'Scale', newScale, true);
            }
        }
    }

    const result = sequence.setSettings(assign(origSettings, settings));
    return { success: true };
}

const getSequenceById = (id: string) => {
    for (let i = 0; i < app.project.sequences.numSequences; i++) {
        const sequence = app.project.sequences[i];

        if (sequence.sequenceID === id) {
            return sequence;
        }
    }
}

export const importToNewSequence = (fn:string, sequenceName?: string) => {
    sequenceName = sequenceName || fn.split('/').pop() || 'Untitled';
    const result = app.project.importFiles([fn], true, app.project.rootItem, false);
    if (!result) return;
    let projectItem = app.project.rootItem.children[app.project.rootItem.children.numItems - 1];

    //@ts-ignore
    const sequence = app.project.createNewSequenceFromClips(sequenceName, [projectItem]);

    return sequence.sequenceID
};

export const applyCutsAndReframe = (sequence?: Sequence|string) => {
    app.enableQE();
    if (!qe) return;
    if (typeof sequence === 'string') {
        sequence = getSequenceById(sequence);
        if (!sequence) return;
    }

    sequence = sequence || app.project.activeSequence;

    for (let i = 0; i < sequence.videoTracks.numTracks; i++) {
        const track = sequence.videoTracks[i];
        for (let j = 0; j < track.clips.numItems; j++) {
            app.project.openSequence(sequence.sequenceID);
            const qeClip = qe.project.getActiveSequence().getVideoTrackAt(i).getItemAt(j);
            const clip = track.clips[j];
            clip.setSelected(true, false);
            const effectWasAdded = qeClip.addVideoEffect(qe.project.getVideoEffectByName('Auto Reframe'));
            if (effectWasAdded) {
                setComponentProperty(clip, 'Auto Reframe', 'Motion Tracking', 1, false);
            }
        }
    }

    //@ts-ignore
    sequence.performSceneEditDetectionOnSelection('ApplyCuts', true, 'LowSensitivity');

    return {success: true};
}

interface ExportOptions {
    workAreaType?: number,
    sequence?: Sequence|string
  }

export const exportSequence = (outputFilePath: string, presetPath: string, options?: ExportOptions) => {
    let { sequence } = options || {};
    if (typeof sequence === 'string') {
        sequence = getSequenceById(sequence);
        if (!sequence) return;
    }
    sequence = sequence || app.project.activeSequence;

    const workAreaType = options?.workAreaType || 0;
    const result = sequence.exportAsMediaDirect(outputFilePath, presetPath, workAreaType);
    if (result !== 'No Error') {
      throw Error(result);
    }
    return {
      success: true
    }
}